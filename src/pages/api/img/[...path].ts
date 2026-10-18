import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { resolveServePath, mimeFor, UPLOADS_DIR } from "@/lib/uploads";
import { IMAGE_WIDTHS } from "@/lib/image-srcset";

export const prerender = false;

const IMMUTABLE = "public, max-age=31536000, immutable";

// `?w=` is validated against this set — never an arbitrary width (a resize DoS
// via `?w=99999` on a 4 MB JPEG would pin a core per request).
const ALLOWED_WIDTHS: ReadonlySet<number> = new Set(IMAGE_WIDTHS);

// Only these can be re-encoded to webp. GIF is excluded: webp output would
// flatten an animation, and losing the animation is worse than a big download.
const DERIVABLE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

// Derivatives live under a dotted dir so `resolveServePath` (which rejects
// segments starting with ".") can never serve a cache file directly.
const DERIVED_DIR = path.join(UPLOADS_DIR, ".derived");

async function readSource(abs: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(abs);
  } catch {
    return null;
  }
}

// Resize to an allowlisted width and cache the webp on disk. The cache key
// includes the source mtime + size, so replacing a file invalidates it without
// any explicit purge. Returns null on any failure so the caller falls back to
// the original bytes.
async function deriveWebp(abs: string, width: number): Promise<Buffer | null> {
  try {
    const st = await fs.stat(abs);
    const key = crypto
      .createHash("sha1")
      .update(`${abs}|${st.mtimeMs}|${st.size}|${width}`)
      .digest("hex");
    const out = path.join(DERIVED_DIR, `${key}.webp`);
    try {
      return await fs.readFile(out);
    } catch {
      // miss — generate below
    }
    const buf = await sharp(abs, { failOn: "none" })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    await fs.mkdir(DERIVED_DIR, { recursive: true });
    await fs.writeFile(out, buf, { mode: 0o644 });
    return buf;
  } catch (e) {
    console.error("[/api/img] derive failed:", e);
    return null;
  }
}

export const GET: APIRoute = async ({ params, url }) => {
  // Astro's catch-all param is a single string ("photos/thumb/x.webp"); the
  // uploads helpers expect the segment array Next's [...path] handed them.
  const parts = (params.path ?? "").split("/");
  const abs = resolveServePath(parts);
  const filename = parts[parts.length - 1];
  const mime = mimeFor(filename);

  const wParam = url.searchParams.get("w");
  const width = wParam === null ? NaN : Number(wParam);
  const wantsDerivative =
    Number.isInteger(width) &&
    ALLOWED_WIDTHS.has(width) &&
    DERIVABLE_MIME.has(mime);

  if (abs) {
    if (wantsDerivative) {
      const derived = await deriveWebp(abs, width);
      if (derived) {
        return new Response(derived, {
          status: 200,
          headers: {
            "content-type": "image/webp",
            "cache-control": IMMUTABLE,
          },
        });
      }
    }
    const buf = await readSource(abs);
    if (buf) {
      return new Response(buf, {
        status: 200,
        headers: {
          "content-type": mime,
          "cache-control": IMMUTABLE,
        },
      });
    }
  }

  // Dev-only fallback: when uploads land on a remote host (UPLOAD_REMOTE set),
  // local previewing 404s because the file never touched local disk. Setting
  // UPLOAD_PROXY_URL=https://furkanunsalan.dev lets the dev server fetch the
  // missing file from prod and stream it back.
  const proxyBase = process.env.UPLOAD_PROXY_URL;
  if (proxyBase) {
    try {
      const suffix = wantsDerivative ? `?w=${width}` : "";
      const remoteUrl = `${proxyBase.replace(/\/$/, "")}/api/img/${parts
        .map(encodeURIComponent)
        .join("/")}${suffix}`;
      const r = await fetch(remoteUrl, { cache: "no-store" });
      if (r.ok) {
        return new Response(r.body, {
          status: 200,
          headers: {
            "content-type": r.headers.get("content-type") || mime,
            "cache-control": "public, max-age=300",
          },
        });
      }
    } catch (e) {
      console.error("[/api/img] proxy fallback failed:", e);
    }
  }
  return new Response("not found", { status: 404 });
};
