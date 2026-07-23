import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// Self-hosted Inter (latin subset, woff2). resvg rasterises it directly — no
// browser, no satori, no hosted-provider SDK. The font ships as a runtime
// dependency so it survives `npm prune --omit=dev` and lands in the image.
const FONT_SUBPATH =
  "@fontsource-variable/inter/files/inter-latin-standard-normal.woff2";

let fontCache: Buffer | null = null;
function interFont(): Buffer {
  if (fontCache) return fontCache;
  const candidates: string[] = [];
  try {
    candidates.push(createRequire(import.meta.url).resolve(FONT_SUBPATH));
  } catch {
    // exports resolution unavailable — fall through to cwd probing
  }
  candidates.push(path.join(process.cwd(), "node_modules", FONT_SUBPATH));
  for (const p of candidates) {
    if (existsSync(p)) {
      fontCache = readFileSync(p);
      return fontCache;
    }
  }
  throw new Error(`OG font not found. Tried:\n${candidates.join("\n")}`);
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Greedy word-wrap by estimated advance width. Inter bold averages ~0.56em per
// glyph; good enough to keep long titles inside the frame without a real shaper.
function wrapTitle(
  text: string,
  fontSize: number,
  maxWidth: number,
  maxLines: number,
): string[] {
  const perChar = fontSize * 0.56;
  const maxChars = Math.max(6, Math.floor(maxWidth / perChar));
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars || !cur) {
      cur = next;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  // If we ran out of lines with words left over, ellipsize the last line.
  const consumed = lines.join(" ").length;
  if (
    lines.length === maxLines &&
    consumed < text.replace(/\s+/g, " ").length
  ) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] =
      last.length > maxChars - 1
        ? `${last.slice(0, maxChars - 1)}…`
        : `${last}…`;
  }
  return lines;
}

type OgFrameProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  footer?: string;
};

export function renderOgImage({
  eyebrow,
  title,
  subtitle,
  footer,
}: OgFrameProps): Response {
  const { width: W, height: H } = OG_SIZE;
  const pad = 72;
  const contentW = W - pad * 2;

  // Auto-shrink long titles so they never overflow the frame.
  const titleSize =
    title.length > 80
      ? 60
      : title.length > 50
        ? 76
        : title.length > 28
          ? 92
          : 108;
  const lineH = titleSize * 1.06;
  const lines = wrapTitle(title, titleSize, contentW, 3);

  // The subtitle is a single line — clamp it so long project descriptions never
  // bleed off the right edge.
  const maxSubChars = Math.floor(contentW / (32 * 0.52));
  const subtitleText =
    subtitle && subtitle.length > maxSubChars
      ? `${subtitle.slice(0, maxSubChars - 1).trimEnd()}…`
      : subtitle;

  const footerBaseline = H - pad; // 558
  const subtitleBaseline = subtitle ? footerBaseline - 60 : null;
  const titleLastBaseline = subtitle
    ? subtitleBaseline! - Math.round(titleSize * 0.35) - 26
    : footerBaseline - 58;

  const titleSvg = lines
    .map((ln, i) => {
      const y = titleLastBaseline - (lines.length - 1 - i) * lineH;
      return `<text x="${pad}" y="${y.toFixed(1)}" font-family="Inter Variable" font-size="${titleSize}" font-weight="700" letter-spacing="-2" fill="#ffffff" stroke="#ffffff" stroke-width="0.8">${esc(ln)}</text>`;
    })
    .join("");

  const subtitleSvg =
    subtitleText && subtitleBaseline !== null
      ? `<text x="${pad}" y="${subtitleBaseline}" font-family="Inter Variable" font-size="32" font-weight="400" fill="#d4d4d4">${esc(subtitleText)}</text>`
      : "";

  const eyebrowY = pad + 22;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="blur" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="70" />
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#000000" />
  <circle cx="1100" cy="60" r="260" fill="rgba(99,102,241,0.22)" filter="url(#blur)" />
  <circle cx="80" cy="610" r="260" fill="rgba(99,102,241,0.10)" filter="url(#blur)" />
  <rect x="${pad}" y="${eyebrowY - 12}" width="12" height="12" rx="2" fill="#6366f1" />
  <text x="${pad + 28}" y="${eyebrowY - 1}" font-family="Inter Variable" font-size="22" font-weight="500" letter-spacing="4" fill="#71717a">${esc(eyebrow.toUpperCase())}</text>
  ${titleSvg}
  ${subtitleSvg}
  <text x="${pad}" y="${footerBaseline}" font-family="Inter Variable" font-size="22" font-weight="400" fill="#71717a">${esc(footer ?? "furkanunsalan.dev")}</text>
  <path d="M${W - pad - 12} ${footerBaseline - 18} L${W - pad} ${footerBaseline - 8} L${W - pad - 12} ${footerBaseline + 2}" fill="none" stroke="#6366f1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

  // resvg's native binding accepts `fontBuffers` (and, unlike `fontFiles`,
  // decodes woff2 through it), but the shipped typings omit the field — declare
  // it locally so this stays type-checked without falling back to `any`.
  const fontOpt: NonNullable<ResvgRenderOptions["font"]> & {
    fontBuffers?: Uint8Array[];
  } = {
    fontBuffers: [interFont()],
    loadSystemFonts: false,
    defaultFontFamily: "Inter Variable",
  };

  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    font: fontOpt,
  })
    .render()
    .asPng();

  return new Response(png, {
    headers: {
      "content-type": OG_CONTENT_TYPE,
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
