import "server-only";
import { slugifyAscii } from "@/lib/slugify";

// Mirrors scripts/add-place.mjs: takes a Google Maps URL (short or full),
// returns parsed coordinates + a Nominatim reverse-geocode result. Used by
// /api/admin/places/resolve-url to pre-fill the admin form.

// Only hostnames whose pages actually expose `@lat,lng` in their URLs go in
// this list. Anything else and the resolver would just fail to find coords
// anyway — so we may as well refuse early and avoid a server-side fetch of
// an arbitrary URL (SSRF).
const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "www.google.com",
  "maps.google.com",
  "google.com",
]);

function hostAllowed(url: string): boolean {
  try {
    return ALLOWED_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export type ResolvedPlace = {
  ok: true;
  name: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  country: string;
  category: string;
  sourceUrl: string; // original (un-resolved) input
  resolvedUrl: string; // post-redirect canonical URL
  suggestedSlug: string;
};

export type ResolveError = { ok: false; error: string; status: number };

// Avoid BigInt literals (1n) so this compiles under older TS targets.
const TWO_64 = BigInt(1) << BigInt(64);
const ZERO = BigInt(0);

function cidUrl(featureIdDecimal: string | null | undefined): string {
  if (!featureIdDecimal) return "";
  try {
    let n = BigInt(featureIdDecimal);
    if (n < ZERO) n += TWO_64;
    return `https://maps.google.com/?cid=${n.toString()}`;
  } catch {
    return "";
  }
}

async function resolveShortLink(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "furkanunsalan.dev/place-importer" },
    });
    return res.url || url;
  } catch {
    return url;
  }
}

function extractLatLngFromUrl(url: string): [number, number] | null {
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
  } catch {
    /* malformed URL */
  }
  return null;
}

function extractNameFromUrl(url: string): string {
  const m = url.match(/\/maps\/place\/([^/]+)/);
  if (!m) return "";
  try {
    return decodeURIComponent(m[1]).replace(/\+/g, " ").trim();
  } catch {
    return m[1];
  }
}

type NominatimResponse = {
  name?: string;
  display_name?: string;
  category?: string;
  type?: string;
  address?: Record<string, string>;
};

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<NominatimResponse | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=18&addressdetails=1`;
  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim's usage policy requires a meaningful UA. Be a good citizen.
        "User-Agent": "furkanunsalan.dev/admin (contact: me@furkanunsalan.dev)",
        "Accept-Language": "en",
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as NominatimResponse;
  } catch {
    return null;
  }
}

export async function resolvePlaceUrl(
  rawUrl: string,
): Promise<ResolvedPlace | ResolveError> {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return { ok: false, error: "url required", status: 400 };
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, error: "http(s) URL required", status: 400 };
  }
  if (!hostAllowed(trimmed)) {
    return {
      ok: false,
      status: 400,
      error: "url must be a Google Maps link",
    };
  }

  // Follow short-link redirects (still bounded to a known-Google host above).
  const resolved =
    new URL(trimmed).hostname === "maps.app.goo.gl" ||
    new URL(trimmed).hostname === "goo.gl"
      ? await resolveShortLink(trimmed)
      : trimmed;

  // After redirect, the final URL might land somewhere else. Re-validate.
  if (!hostAllowed(resolved)) {
    return {
      ok: false,
      status: 422,
      error: "short link redirected to an unexpected host",
    };
  }

  const ll = extractLatLngFromUrl(resolved);
  if (!ll) {
    return {
      ok: false,
      status: 422,
      error:
        "Couldn't pull lat/lng out of the URL. Open the place in maps.google.com and copy the full URL (the one containing @lat,lng).",
    };
  }
  const [lat, lng] = ll;

  const nameFromUrl = extractNameFromUrl(resolved);
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

  // Match the cid-style URL the placelist importer writes so links stay
  // consistent across import paths.
  const url = new URL(resolved);
  const cidParam = url.searchParams.get("cid");
  const sourceUrl = cidParam ? cidUrl(cidParam) : trimmed;

  const suggestedSlug = slugifyAscii(name, "place");

  return {
    ok: true,
    name,
    lat,
    lng,
    address: geo?.display_name || "",
    city:
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      "",
    country: addr.country || "",
    category: geo?.category || geo?.type || "",
    sourceUrl,
    resolvedUrl: resolved,
    suggestedSlug,
  };
}
