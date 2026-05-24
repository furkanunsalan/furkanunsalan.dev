#!/usr/bin/env node
/**
 * Import a Google Maps shared-list XHR response into the `places` collection.
 *
 *   node scripts/import-placelist.mjs <path-to-entitylist-response> [--force]
 *
 * The expected input is the raw response body of the request Google Maps
 * fires to render a public list page (look in DevTools → Network for a request
 * whose response contains your list ID). Google prepends the XSSI guard
 * `)]}'\n` to its JSON responses — the parser strips it.
 *
 * The response is a nested array (no documented schema). The shape this parser
 * assumes for each place entry:
 *
 *   entry[1]  = location bundle
 *     [1][2]   "<full address with name>"
 *     [1][4]   "<address only>"
 *     [1][5]   [null, null, lat, lng]
 *     [1][6]   ["<feature-id-a>", "<feature-id-b>"]
 *     [1][7]   "/g/<mid>" or "/m/<mid>"
 *   entry[2]  = display name
 *   entry[3]  = user-attached note (sometimes empty, sometimes a URL)
 *   entry[9]  = [created_sec, created_ns]  ← used for the "added at" sort key
 *
 * If Google ever reshuffles the array, this script will start dropping fields
 * silently — re-check field indices against a known place.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const placesDir = path.join(root, "content", "places");

const argv = process.argv.slice(2);
const force = argv.includes("--force");
const input = argv.find((a) => !a.startsWith("--"));

if (!input) {
  console.error(
    "Usage: node scripts/import-placelist.mjs <entitylist-response.txt> [--force]",
  );
  process.exit(1);
}
if (!fs.existsSync(input)) {
  console.error(`Not found: ${input}`);
  process.exit(1);
}

const raw = fs.readFileSync(input, "utf8");
const stripped = raw.replace(/^\)\]\}'\s*/, "");
let data;
try {
  data = JSON.parse(stripped);
} catch (e) {
  console.error(`Could not parse JSON: ${e.message}`);
  process.exit(1);
}

function slugify(s) {
  return (
    String(s || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "place"
  );
}

function uniqueSlug(base, taken) {
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

// Google emits the feature ID as a signed int64 string. The Maps "cid" URL
// scheme expects the same number as an unsigned int64, so negative IDs need
// to wrap around 2^64. We use BigInt so the precision doesn't get clipped.
const TWO_64 = 1n << 64n;
function cidUrl(featureIdDecimal) {
  if (!featureIdDecimal) return "";
  try {
    let n = BigInt(featureIdDecimal);
    if (n < 0n) n += TWO_64;
    return `https://maps.google.com/?cid=${n.toString()}`;
  } catch {
    return "";
  }
}

// City/country derived from the address tail. Turkish addresses end with
// "<district>/<city>" — peel that off; country is "Türkiye" unless we know
// otherwise (the response doesn't carry a country code).
function deriveCityCountry(address) {
  if (!address) return { city: "", country: "" };
  const tail = address.split(",").map((s) => s.trim()).pop() || "";
  const parts = tail.split("/").map((s) => s.trim()).filter(Boolean);
  // Strip a leading "34xxx" postal code from the district if present.
  const cityRaw = parts[parts.length - 1] || "";
  const city = cityRaw.replace(/^\d{4,6}\s+/, "");
  return { city, country: "" };
}

// data[0] is the list header bundle: [..., listName at [4], ..., entries at [8]].
const header = data?.[0];
if (!Array.isArray(header)) {
  console.error("Unexpected response shape (no header array).");
  process.exit(1);
}
const listName = header[4] || "";
const entries = Array.isArray(header[8]) ? header[8] : [];
if (entries.length === 0) {
  console.error("No entries found in the response.");
  process.exit(1);
}

const taken = new Set(
  fs.existsSync(placesDir)
    ? fs
        .readdirSync(placesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [],
);

let written = 0;
let skipped = 0;
let dropped = 0;

for (const entry of entries) {
  if (!Array.isArray(entry)) continue;
  const loc = entry[1];
  const name = entry[2];
  const note = entry[3];
  if (!name || !Array.isArray(loc)) {
    dropped++;
    continue;
  }
  const coords = loc[5];
  const lat = Array.isArray(coords) ? coords[2] : null;
  const lng = Array.isArray(coords) ? coords[3] : null;
  if (typeof lat !== "number" || typeof lng !== "number") {
    console.warn(`  no coords for "${name}", skipping`);
    dropped++;
    continue;
  }
  const fullAddr = (loc[2] || "").replace(/^.*?,\s*/, "");
  const addressOnly = loc[4] || fullAddr || "";
  const featureIds = Array.isArray(loc[6]) ? loc[6] : [];
  const sourceUrl = cidUrl(featureIds[1]) || cidUrl(featureIds[0]);
  const { city, country } = deriveCityCountry(addressOnly || fullAddr);
  const createdAt = Array.isArray(entry[9]) ? entry[9] : null;
  const addedAt =
    createdAt && typeof createdAt[0] === "number"
      ? new Date(createdAt[0] * 1000).toISOString()
      : "";

  const baseSlug = slugify(name);
  const slug = force ? baseSlug : uniqueSlug(baseSlug, taken);
  const dir = path.join(placesDir, slug);
  const file = path.join(dir, "index.json");
  if (!force && fs.existsSync(file)) {
    skipped++;
    continue;
  }

  const payload = {
    name,
    lat,
    lng,
    address: addressOnly,
    list: listName,
    category: "",
    country,
    city,
    status: "want-to-go",
    sourceUrl,
    addedAt,
    tags: [],
    notes: note && typeof note === "string" ? note : "",
  };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + "\n");
  taken.add(slug);
  written++;
}

console.log(
  `List: "${listName}" · imported ${written} · skipped ${skipped} (exists) · dropped ${dropped}`,
);
