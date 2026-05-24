#!/usr/bin/env node
/**
 * Import places from a Google Takeout "Maps (your places)" + "Saved" export
 * into the Keystatic `places` collection.
 *
 *   node scripts/import-takeout-places.mjs <path-to-Takeout-dir-or-file> [--force]
 *
 * Walks the given path recursively and ingests two shapes:
 *
 *   1. GeoJSON FeatureCollection — "Saved Places.json", "Labelled places.json"
 *      Coords from geometry.coordinates ([lng, lat]); name from Title;
 *      address from properties.Location.Address.
 *
 *   2. CSV lists — Takeout > Saved > "<List Name>.csv" (Title, Note, URL, …)
 *      Coords are extracted from the URL when possible. Rows without
 *      resolvable coordinates are written with lat=0/lng=0 and reported so
 *      the user can fix them by hand in /keystatic or via add-place.mjs.
 *
 * Existing entries are preserved — pass --force to overwrite.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const placesDir = path.join(root, "content", "places");

const argv = process.argv.slice(2);
const force = argv.includes("--force");
const target = argv.find((a) => !a.startsWith("--"));

if (!target) {
  console.error(
    "Usage: node scripts/import-takeout-places.mjs <Takeout-path> [--force]",
  );
  process.exit(1);
}
if (!fs.existsSync(target)) {
  console.error(`Path not found: ${target}`);
  process.exit(1);
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "place";
}

function uniqueSlug(base, taken) {
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

// Try to pull lat/lng out of a Google Maps URL. Returns [lat, lng] or null.
// Handles short links only if they've been followed already.
function extractLatLngFromUrl(url) {
  if (!url) return null;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const full = u.toString();
  // ?q=lat,lng or ?query=lat,lng
  for (const key of ["q", "query", "ll", "center"]) {
    const v = u.searchParams.get(key);
    if (v && /^-?\d+\.\d+,-?\d+\.\d+$/.test(v.trim())) {
      const [lat, lng] = v.trim().split(",").map(Number);
      return [lat, lng];
    }
  }
  // @lat,lng,zoom
  const at = full.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return [parseFloat(at[1]), parseFloat(at[2])];
  // !3d<lat>!4d<lng>
  const deep = full.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (deep) return [parseFloat(deep[1]), parseFloat(deep[2])];
  return null;
}

function walk(dir, out = []) {
  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    out.push(dir);
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Minimal CSV parser that handles RFC-4180-ish quoting (double-quoted fields,
// embedded commas, embedded newlines, doubled quotes). Good enough for Takeout
// — these files are machine-generated.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // swallow; \n will terminate
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c && c.length));
}

const takenSlugs = new Set(
  fs.existsSync(placesDir)
    ? fs
        .readdirSync(placesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [],
);

let written = 0;
let skipped = 0;
let missingCoords = 0;

function writePlace(data) {
  const baseSlug = slugify(data.slug || data.name);
  const slug = force ? baseSlug : uniqueSlug(baseSlug, takenSlugs);
  const dir = path.join(placesDir, slug);
  const file = path.join(dir, "index.json");
  if (!force && fs.existsSync(file)) {
    skipped++;
    return;
  }
  fs.mkdirSync(dir, { recursive: true });
  const payload = {
    name: data.name,
    lat: typeof data.lat === "number" ? data.lat : 0,
    lng: typeof data.lng === "number" ? data.lng : 0,
    address: data.address || "",
    list: data.list || "",
    category: data.category || "",
    country: data.country || "",
    city: data.city || "",
    status: data.status || "want-to-go",
    sourceUrl: data.sourceUrl || "",
    addedAt: data.addedAt || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    notes: "",
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + "\n");
  takenSlugs.add(slug);
  written++;
  if (payload.lat === 0 && payload.lng === 0) missingCoords++;
}

function ingestGeoJson(file) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`  skip (invalid JSON): ${file}`);
    return;
  }
  const features = Array.isArray(json?.features) ? json.features : [];
  if (!features.length) return;
  const listName = path
    .basename(file, ".json")
    .replace(/\s*\(.*\)\s*/g, "")
    .trim();
  for (const f of features) {
    const coords = f?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const [lng, lat] = coords;
    const props = f.properties || {};
    const loc = props.Location || props.location || {};
    const name =
      props.Title ||
      loc["Business Name"] ||
      loc.Name ||
      loc.Address ||
      `Place ${lat.toFixed(4)},${lng.toFixed(4)}`;
    writePlace({
      name,
      lat,
      lng,
      address: loc.Address || "",
      country: loc["Country Code"] || "",
      list: listName,
      sourceUrl: props["Google Maps URL"] || loc["Google Maps URL"] || "",
    });
  }
}

function ingestCsv(file) {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  if (rows.length < 2) return;
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (key) => header.findIndex((h) => h === key);
  const iTitle = idx("title");
  const iNote = idx("note");
  const iUrl = idx("url");
  const iComment = idx("comment");
  if (iTitle < 0 || iUrl < 0) return; // not a Takeout list CSV
  const listName = path.basename(file, ".csv").trim();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const title = (row[iTitle] || "").trim();
    if (!title) continue;
    const url = (row[iUrl] || "").trim();
    const note = ((iNote >= 0 ? row[iNote] : "") || "").trim();
    const comment = ((iComment >= 0 ? row[iComment] : "") || "").trim();
    const ll = extractLatLngFromUrl(url);
    writePlace({
      name: title,
      lat: ll ? ll[0] : 0,
      lng: ll ? ll[1] : 0,
      address: comment,
      list: listName,
      sourceUrl: url,
    });
    if (note) {
      // Keep notes for manual review — log so user can paste into Keystatic.
      console.log(`  note for "${title}": ${note}`);
    }
  }
}

const files = walk(target);
for (const f of files) {
  const lower = f.toLowerCase();
  if (lower.endsWith(".json") && /(places|saved|labelled)/.test(lower)) {
    ingestGeoJson(f);
  } else if (lower.endsWith(".csv")) {
    ingestCsv(f);
  }
}

console.log(
  `Imported ${written} place(s) · ${skipped} skipped (exists) · ${missingCoords} need coordinates`,
);
if (missingCoords) {
  console.log(
    `  Tip: list CSVs don't include coordinates. Fill them in /keystatic, ` +
      `or run: node scripts/add-place.mjs <google-maps-url>`,
  );
}
