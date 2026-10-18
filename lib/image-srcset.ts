// Derivative widths the /api/img endpoint will resize to. An allowlist, not a
// free-form width: `?w=` is attacker-controlled, so every accepted value must
// be one of a handful of ints (arbitrary widths = a resize DoS). Shared by the
// serving route (which validates against it) and SmartImage (which builds
// `srcset` from it), so keep both ends reading from this one list.
export const IMAGE_WIDTHS = [160, 280, 480, 640, 960, 1280, 1920] as const;

const DERIVABLE_PREFIX = "/api/img/";

// Only same-origin uploads served by /api/img can be resized. Static files in
// `public/` (legacy `/posts/*`, `/banners/*`) and absolute/remote URLs have no
// derivative endpoint, so they get no `srcset` and keep their plain `src`.
export function isDerivable(src: string): boolean {
  return typeof src === "string" && src.startsWith(DERIVABLE_PREFIX);
}

export function derivativeUrl(src: string, width: number): string {
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}w=${width}`;
}

export function srcSetFor(src: string): string | undefined {
  if (!isDerivable(src)) return undefined;
  return IMAGE_WIDTHS.map((w) => `${derivativeUrl(src, w)} ${w}w`).join(", ");
}
