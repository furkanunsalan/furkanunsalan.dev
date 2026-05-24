#!/usr/bin/env node
/**
 * One-off import of the clean Nominatim matches from the "Gezilecek Yerler"
 * post into the places collection. Only the 25 entries we confirmed during
 * review — the no-match / wrong-globe rows were dropped.
 *
 *   node scripts/import-post-places.mjs
 *
 * Idempotent: skips slugs that already exist. Pass --force to overwrite.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const placesDir = path.join(root, "content", "places");
const force = process.argv.includes("--force");

const PLACES = [
  // --- Chill ---
  { name: "Yeniköy Kitapçısı", lat: 41.11846, lng: 29.067, address: "Yeniköy Tarabya Caddesi, Yeniköy Mahallesi, Sarıyer", city: "Sarıyer", country: "Türkiye", status: "want-to-go", tags: ["chill", "bookstore", "study"] },
  { name: "Kernel Coffee Roasters", lat: 40.96316, lng: 29.08118, address: "Çolak İsmail Sokağı, Suadiye Mahallesi, Kadıköy", city: "Kadıköy", country: "Türkiye", status: "want-to-go", tags: ["chill", "coffee"] },
  { name: "KEY Museum", lat: 38.20154, lng: 27.34879, address: "Çapak Mahallesi, Torbalı, İzmir", city: "İzmir", country: "Türkiye", status: "want-to-go", tags: ["chill", "museum", "izmir", "car"] },

  // --- Yemek (want-to-go) ---
  { name: "Sotapi", lat: 40.98678, lng: 29.02684, address: "Kadife Sokağı, Bahariye, Caferağa Mahallesi, Kadıköy", city: "Kadıköy", country: "Türkiye", status: "want-to-go", tags: ["food"] },
  { name: "Ciğerci Apo", lat: 39.90914, lng: 32.81781, address: "Ziyabey Caddesi, Balgat Mahallesi, Çankaya, Ankara", city: "Ankara", country: "Türkiye", status: "want-to-go", tags: ["food", "ankara", "liver"] },
  { name: "Bayramoğlu Döner", lat: 41.095, lng: 29.09964, address: "Seyfi Baba Sokağı, Rüzgarlıbahçe Mahallesi, Beykoz", city: "Beykoz", country: "Türkiye", status: "want-to-go", tags: ["food", "döner"] },
  { name: "Eataly", lat: 41.06572, lng: 29.01705, address: "Koru Sokağı, Levazım Mahallesi, Beşiktaş", city: "Beşiktaş", country: "Türkiye", status: "want-to-go", tags: ["food", "italian", "pizza"] },
  { name: "Hüseyin Usta Lahmacun", lat: 40.25206, lng: 28.97669, address: "1. Hatun Sokak, Hamitler Mahallesi, Osmangazi, Bursa", city: "Bursa", country: "Türkiye", status: "want-to-go", tags: ["food", "lahmacun", "bursa"] },
  { name: "Stüdyo Pizza", lat: 39.90065, lng: 32.85854, address: "Kuveyt Caddesi, Güvenevler Mahallesi, Çankaya, Ankara", city: "Ankara", country: "Türkiye", status: "want-to-go", tags: ["food", "pizza", "ankara"] },
  { name: "Miss Pizza Şişhane", lat: 41.02862, lng: 28.97306, address: "Meşrutiyet Caddesi, Asmalı Mescit Mahallesi, Beyoğlu", city: "Beyoğlu", country: "Türkiye", status: "want-to-go", tags: ["food", "pizza"] },
  { name: "Kruvasan", lat: 41.04991, lng: 28.99569, address: "Av. Süreyya Ağaoğlu Sokağı, Teşvikiye Mahallesi, Nişantaşı, Şişli", city: "Şişli", country: "Türkiye", status: "want-to-go", tags: ["food", "bakery", "nişantaşı"] },

  // --- Yemek (been) ---
  { name: "Welldone", lat: 41.00163, lng: 29.05539, address: "Çeçen Sokak, Acıbadem Mahallesi, Üsküdar", city: "Üsküdar", country: "Türkiye", status: "been", tags: ["food"] },

  // --- Tatlı (want-to-go) ---
  { name: "Como Bakery", lat: 41.04403, lng: 29.00187, address: "Köşeli Sokağı, Sinanpaşa Mahallesi, Akaretler, Beşiktaş", city: "Beşiktaş", country: "Türkiye", status: "want-to-go", tags: ["dessert", "bakery", "tiramisu"] },
  { name: "Valeria Coffee Dessert", lat: 40.98604, lng: 29.02544, address: "Moda Caddesi, Caferağa Mahallesi, Kadıköy", city: "Kadıköy", country: "Türkiye", status: "want-to-go", tags: ["dessert", "coffee", "brulee"] },
  { name: "Filo D'Olio", lat: 40.96581, lng: 29.07109, address: "Bağdat Caddesi, Caddebostan Mahallesi, Kadıköy", city: "Kadıköy", country: "Türkiye", status: "want-to-go", tags: ["dessert", "tiramisu"] },
  { name: "Mendels Chocolatier", lat: 41.04281, lng: 29.00265, address: "Şair Nedim Caddesi, Sinanpaşa Mahallesi, Akaretler, Beşiktaş", city: "Beşiktaş", country: "Türkiye", status: "want-to-go", tags: ["dessert", "chocolate"] },

  // --- Tatlı (been) ---
  { name: "Moda Da Nata", lat: 40.98595, lng: 29.02731, address: "Dr. İhsan Ünlüer Sokağı, Bahariye, Caferağa Mahallesi, Kadıköy", city: "Kadıköy", country: "Türkiye", status: "been", tags: ["dessert", "bakery"] },

  // --- Burger (want-to-go) ---
  { name: "The Townhouse", lat: 40.95797, lng: 29.08172, address: "Plaj Yolu Sokağı, Şaşkınbakkal, Suadiye Mahallesi, Kadıköy", city: "Kadıköy", country: "Türkiye", status: "want-to-go", tags: ["burger"] },
  { name: "Biber Burger", lat: 40.98326, lng: 29.02358, address: "Yeni Fikir Sokağı, Moda, Caferağa Mahallesi, Kadıköy", city: "Kadıköy", country: "Türkiye", status: "want-to-go", tags: ["burger"] },
  { name: "Basta Street Food", lat: 40.98774, lng: 29.02615, address: "Sakız Gülü Sokağı, Bahariye, Caferağa Mahallesi, Kadıköy", city: "Kadıköy", country: "Türkiye", status: "want-to-go", tags: ["burger", "street-food"] },
  { name: "J Burger", lat: 40.97173, lng: 29.05175, address: "Operatör Cemil Topuzlu Caddesi, Kalamış, Caddebostan Mahallesi, Kadıköy", city: "Kadıköy", country: "Türkiye", status: "want-to-go", tags: ["burger"] },

  // --- Burger (been) ---
  { name: "Tok BBQ", lat: 40.96597, lng: 29.06726, address: "Caddebostan İskele Sokağı, Caddebostan Mahallesi, Kadıköy", city: "Kadıköy", country: "Türkiye", status: "been", tags: ["burger", "bbq"] },
  { name: "Nom Burger", lat: 40.98577, lng: 29.02297, address: "Leylek Sokağı, Moda, Caferağa Mahallesi, Kadıköy", city: "Kadıköy", country: "Türkiye", status: "been", tags: ["burger"] },
  { name: "House of B", lat: 41.04258, lng: 29.00254, address: "Şair Nedim Caddesi, Sinanpaşa Mahallesi, Akaretler, Beşiktaş", city: "Beşiktaş", country: "Türkiye", status: "been", tags: ["burger"] },
  { name: "Burgerlab", lat: 41.02553, lng: 28.97983, address: "Dericiler Sokağı, Kemankeş Karamustafa Paşa Mahallesi, Karaköy, Beyoğlu", city: "Beyoğlu", country: "Türkiye", status: "been", tags: ["burger"] },
];

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

const taken = new Set(
  fs.existsSync(placesDir)
    ? fs
        .readdirSync(placesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [],
);

const addedAt = new Date().toISOString();
let written = 0;
let skipped = 0;

for (const p of PLACES) {
  const slug = slugify(p.name);
  const dir = path.join(placesDir, slug);
  const file = path.join(dir, "index.json");
  if (!force && fs.existsSync(file)) {
    skipped++;
    continue;
  }
  // Google's place-search by coords opens the right spot AND surfaces the
  // nearest business card without us needing to know its CID.
  const sourceUrl = `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  const payload = {
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    list: "Gezilecek Yerler",
    category: "",
    country: p.country,
    city: p.city,
    status: p.status,
    sourceUrl,
    addedAt,
    tags: p.tags,
    notes: "",
  };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + "\n");
  taken.add(slug);
  written++;
}

console.log(`Imported ${written} · skipped ${skipped} (exists)`);
