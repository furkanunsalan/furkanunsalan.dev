#!/usr/bin/env node
/**
 * Add a single place to the Keystatic `places` collection from a Google Maps
 * URL. Resolves short links (maps.app.goo.gl), parses lat/lng + name from
 * the canonical URL, and reverse-geocodes with OSM Nominatim for address /
 * country / city.
 *
 *   node scripts/add-place.mjs "<google-maps-url>" [--list "Cafes"] [--status want-to-go|been|favorite]
 *
 * Output: writes content/places/<slug>/index.json so the entry shows up in
 * /keystatic for review. Idempotent (skips if slug already exists).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const placesDir = path.join(root, "content", "places");

const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith("--"));
const inputUrl = positional[0];
const listFlag = (() => {
  const i = argv.indexOf("--list");
  return i >= 0 ? argv[i + 1] : "";
})();
const statusArg = (() => {
  const i = argv.indexOf("--status");
  return i >= 0 ? argv[i + 1] : "";
})();
const status =
  statusArg === "been" || statusArg === "favorite" ? statusArg : "want-to-go";

if (!inputUrl) {
  console.error(
    'Usage: node scripts/add-place.mjs "<google-maps-url>" [--list "Cafes"] [--status want-to-go|been|favorite]',
  );
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

async function resolveShortLink(url) {
  // Short links redirect to the canonical /maps/place/... URL. We only need
  // the redirect target, not the body — but Node's fetch follows redirects
  // by default and exposes the final URL via res.url.
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "furkanunsalan.dev/place-importer" },
    });
    return res.url || url;
  } catch (e) {
    console.warn(`  could not resolve short link: ${e.message}`);
    return url;
  }
}

function extractLatLngFromUrl(url) {
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return [parseFloat(at[1]), parseFloat(at[2])];
  const deep = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (deep) return [parseFloat(deep[1]), parseFloat(deep[2])];
  try {
    const u = new URL(url);
    for (const key of ["q", "query", "ll", "center"]) {
      const v = u.searchParams.get(key);
      if (v && /^-?\d+\.\d+,-?\d+\.\d+$/.test(v.trim())) {
        const [lat, lng] = v.trim().split(",").map(Number);
        return [lat, lng];
      }
    }
  } catch {}
  return null;
}

function extractNameFromUrl(url) {
  // Matches /maps/place/<URL-encoded name>/...
  const m = url.match(/\/maps\/place\/([^/]+)/);
  if (!m) return "";
  try {
    return decodeURIComponent(m[1]).replace(/\+/g, " ").trim();
  } catch {
    return m[1];
  }
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=18&addressdetails=1`;
  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim's policy requires a real User-Agent. Be a good citizen.
        "User-Agent": "furkanunsalan.dev/place-importer (contact: me@furkanunsalan.dev)",
        "Accept-Language": "en",
      },
    });
    if (!res.ok) {
      console.warn(`  nominatim ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`  nominatim failed: ${e.message}`);
    return null;
  }
}

const resolved = inputUrl.includes("maps.app.goo.gl")
  ? await resolveShortLink(inputUrl)
  : inputUrl;

const ll = extractLatLngFromUrl(resolved);
if (!ll) {
  console.error(
    "Could not extract coordinates from URL. Open the place in maps.google.com and copy the full URL (the one containing @lat,lng).",
  );
  console.error("Resolved URL was:", resolved);
  process.exit(1);
}
const [lat, lng] = ll;

const nameFromUrl = extractNameFromUrl(resolved);

console.log(`Resolved: ${nameFromUrl || "(no name in URL)"} @ ${lat},${lng}`);
console.log("Reverse-geocoding via Nominatim…");
const geo = await reverseGeocode(lat, lng);
const addr = geo?.address || {};
const name =
  nameFromUrl ||
  geo?.name ||
  addr.amenity ||
  addr.tourism ||
  addr.shop ||
  addr.road ||
  `Place ${lat.toFixed(4)},${lng.toFixed(4)}`;

const slug = slugify(name);
const dir = path.join(placesDir, slug);
const file = path.join(dir, "index.json");
if (fs.existsSync(file)) {
  console.error(`Already exists: ${file}`);
  console.error(`Edit it in /keystatic or delete the directory first.`);
  process.exit(1);
}

const payload = {
  name,
  lat,
  lng,
  address: geo?.display_name || "",
  list: listFlag || "",
  category: geo?.category || geo?.type || "",
  country: addr.country || "",
  city: addr.city || addr.town || addr.village || addr.municipality || "",
  status,
  sourceUrl: inputUrl,
  addedAt: new Date().toISOString(),
  tags: [],
  notes: "",
};

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, JSON.stringify(payload, null, 2) + "\n");
console.log(`Wrote ${path.relative(root, file)}`);
