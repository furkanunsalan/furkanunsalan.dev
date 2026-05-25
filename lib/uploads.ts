import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

// Uploads live OUTSIDE the standalone bundle so they survive rsync deploys.
// Default for dev is <repo>/.uploads (gitignored); in prod, set UPLOADS_DIR
// to something like /root/furkanunsalan-uploads.
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(process.cwd(), ".uploads");

// SVG intentionally excluded: served from the same origin, an `<script>`
// inside a user-uploaded .svg executes as JS for furkanunsalan.dev — full
// CMS-level XSS via the upload-then-load path. Re-enable only after either
// (a) routing SVGs through a sanitiser like DOMPurify on save, or (b) serving
// with `content-disposition: attachment` and a strict CSP.
const ALLOWED_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Collections allowed to upload — keeps random POSTs from creating arbitrary
// subdirectories on disk.
const ALLOWED_DIRS = new Set([
  "posts",
  "projects",
  "experiences",
  "places",
  "misc",
]);

export type UploadResult =
  | { ok: true; url: string; bytes: number; mime: string }
  | { ok: false; error: string; status: number };

function safeSlugBase(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return (
    base
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file"
  );
}

function randPrefix(): string {
  // Cryptographically random — makes the URL unguessable in addition to
  // collision-resistant. 6 bytes → 8-char base64url.
  return randomBytes(6).toString("base64url");
}

export async function saveUpload(
  file: File,
  dir: string,
): Promise<UploadResult> {
  if (!ALLOWED_DIRS.has(dir)) {
    return { ok: false, status: 400, error: `bad dir "${dir}"` };
  }
  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    return {
      ok: false,
      status: 415,
      error: `unsupported file type "${file.type}"`,
    };
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return {
      ok: false,
      status: 413,
      error: `file size ${file.size} bytes out of range (max ${MAX_BYTES})`,
    };
  }

  const filename = `${randPrefix()}-${safeSlugBase(file.name)}${ext}`;
  const dest = path.join(UPLOADS_DIR, dir, filename);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(dest, buf, { mode: 0o644 });

  return {
    ok: true,
    url: `/api/img/${dir}/${filename}`,
    bytes: buf.length,
    mime: file.type,
  };
}

// Path-traversal guard for the serving route. Returns the absolute file path
// if it's safely inside UPLOADS_DIR, otherwise null.
export function resolveServePath(parts: string[]): string | null {
  if (!Array.isArray(parts) || parts.length === 0) return null;
  // Disallow any segment containing path separators or starting with ".".
  for (const p of parts) {
    if (!p || p.includes("/") || p.includes("\\") || p.startsWith(".")) {
      return null;
    }
  }
  const abs = path.resolve(UPLOADS_DIR, ...parts);
  const root = path.resolve(UPLOADS_DIR) + path.sep;
  if (!abs.startsWith(root)) return null;
  return abs;
}

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export function mimeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_BY_EXT[ext] || "application/octet-stream";
}
