#!/usr/bin/env node
/**
 * Read-only Nominatim search runner. Takes a JSON file of place queries and
 * prints the top match for each so the user can review before importing.
 *
 *   node scripts/search-places.mjs <queries.json>
 *
 * Input shape:
 *   {
 *     "list": "Chill Mekanlar",
 *     "status": "want-to-go",
 *     "items": [
 *       { "name": "Kernel Coffee", "where": "Caddebostan" },
 *       ...
 *     ]
 *   }
 *
 * Output: prints one line per place with the resolved name, coords, address,
 * OSM class/type, and importance score. Nothing is written to disk.
 */
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/search-places.mjs <queries.json>");
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(file, "utf8"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchNominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=3&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "furkanunsalan.dev/place-importer (contact: me@furkanunsalan.dev)",
      "Accept-Language": "tr,en;q=0.8",
    },
  });
  if (!res.ok) return { ok: false, status: res.status, results: [] };
  return { ok: true, results: await res.json() };
}

// Progressive query fallback: businesses are spottily tagged in OSM, so we
// try the most specific query first (name + neighborhood + city), then drop
// terms. Returns the first non-empty hit along with which attempt produced it.
async function search(name, where) {
  const cityFallback =
    where && /Ankara|Bursa|İzmir/i.test(where) ? where : "İstanbul";
  const attempts = [
    [name, where, "İstanbul"].filter(Boolean).join(", "),
    `${name} ${where || ""}`.trim(),
    `${name} ${cityFallback}`,
    name,
  ];
  let lastErr = "no-match";
  for (let i = 0; i < attempts.length; i++) {
    const q = attempts[i];
    if (!q) continue;
    if (i > 0) await sleep(1100);
    const r = await fetchNominatim(q);
    if (!r.ok) {
      lastErr = String(r.status);
      continue;
    }
    if (r.results.length === 0) continue;
    // Prefer the highest-importance hit; tie-break by amenity/shop class.
    const top = [...r.results].sort((a, b) => {
      const aw =
        (a.importance ?? 0) +
        (["amenity", "shop", "tourism", "leisure"].includes(a.class) ? 0.1 : 0);
      const bw =
        (b.importance ?? 0) +
        (["amenity", "shop", "tourism", "leisure"].includes(b.class) ? 0.1 : 0);
      return bw - aw;
    })[0];
    return {
      ok: true,
      name: top.name || top.display_name?.split(",")[0] || "",
      display: top.display_name || "",
      lat: parseFloat(top.lat),
      lng: parseFloat(top.lon),
      cls: top.class,
      type: top.type,
      importance: top.importance,
      addr: top.address || {},
      query: q,
      attempt: i + 1,
    };
    // small breath between in-loop retries
  }
  return { ok: false, status: lastErr };
}

const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);

console.log(
  `# ${cfg.list}  ·  status=${cfg.status}  ·  ${cfg.items.length} items\n`,
);

for (let i = 0; i < cfg.items.length; i++) {
  const { name, where } = cfg.items[i];
  const idx = String(i + 1).padStart(2, "0");
  try {
    const r = await search(name, where);
    if (!r.ok) {
      console.log(`${idx}. ${pad(name, 32)}  →  NO MATCH (${r.status})`);
    } else {
      const city =
        r.addr.city || r.addr.town || r.addr.suburb || r.addr.county || "";
      console.log(
        `${idx}. ${pad(name, 32)}  →  ${pad(r.name, 36)}  ${r.lat.toFixed(5)},${r.lng.toFixed(5)}  [${r.cls}/${r.type}, imp=${(r.importance ?? 0).toFixed(2)}, try#${r.attempt}]  ${city}`,
      );
      console.log(`     addr: ${r.display}`);
    }
  } catch (e) {
    console.log(`${idx}. ${pad(name, 32)}  →  ERROR: ${e.message}`);
  }
  // Nominatim policy: max 1 req/sec from a single source.
  await sleep(1100);
}
