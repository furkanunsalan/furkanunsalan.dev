import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

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
  "thoughts",
  "photos",
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
  const buf = Buffer.from(await file.arrayBuffer());

  const remote = parseUploadRemote();
  if (remote) {
    // Dev-against-prod: stream the buffer over ssh to the prod uploads dir,
    // never touch the local filesystem. Pair with UPLOAD_PROXY_URL so the local
    // /api/img can fall back to fetching from prod when previewing.
    try {
      await writeRemote(buf, remote, dir, filename);
    } catch (e) {
      return {
        ok: false,
        status: 502,
        error: `remote upload failed: ${(e as Error).message}`,
      };
    }
  } else {
    const dest = path.join(UPLOADS_DIR, dir, filename);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, buf, { mode: 0o644 });
  }

  return {
    ok: true,
    url: `/api/img/${dir}/${filename}`,
    bytes: buf.length,
    mime: file.type,
  };
}

// Photos are served from nested variant dirs (photos/display, photos/thumb)
// rather than the flat single-file layout saveUpload uses, so they get their
// own writer that still honours the dev-against-prod remote path.
export async function writePhotoVariant(
  buf: Buffer,
  variant: "display" | "thumb",
  filename: string,
): Promise<void> {
  const remote = parseUploadRemote();
  if (remote) {
    await writeRemote(buf, remote, `photos/${variant}`, filename);
  } else {
    const dest = path.join(UPLOADS_DIR, "photos", variant, filename);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, buf, { mode: 0o644 });
  }
}

export async function deletePhotoVariants(id: string): Promise<void> {
  const file = `${id}.webp`;
  const remote = parseUploadRemote();
  if (remote) {
    await deleteRemoteFiles(remote, "photos/display", [file]).catch(() => {});
    await deleteRemoteFiles(remote, "photos/thumb", [file]).catch(() => {});
  } else {
    for (const variant of ["display", "thumb"] as const) {
      await fs
        .rm(path.join(UPLOADS_DIR, "photos", variant, file), { force: true })
        .catch(() => {});
    }
  }
}

export type UploadRemote = { user: string; host: string; dir: string };

export function parseUploadRemote(): UploadRemote | null {
  const v = process.env.UPLOAD_REMOTE;
  if (!v) return null;
  // Format: "user@host:/abs/path"
  const m = v.match(/^([^@\s]+)@([^:\s]+):(\/.+)$/);
  if (!m) return null;
  return { user: m[1], host: m[2], dir: m[3].replace(/\/$/, "") };
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

// Run an arbitrary command on the upload-remote host. Returns stdout. Throws
// with stderr on non-zero exit. Used by the sweep endpoint to list and delete
// files that live on prod when we're in dev-against-prod mode.
export function sshRun(r: UploadRemote, cmd: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(
      "ssh",
      [
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=10",
        `${r.user}@${r.host}`,
        cmd,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (c) => {
      stdout += String(c);
    });
    child.stderr?.on("data", (c) => {
      stderr += String(c);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else
        reject(new Error(`ssh exited ${code}: ${stderr.slice(0, 400).trim()}`));
    });
  });
}

export async function listRemoteFiles(
  r: UploadRemote,
  dir: string,
): Promise<string[]> {
  // -1 = one file per line, -A = include dotfiles minus . and ..
  const remoteDir = `${r.dir}/${dir}`;
  // `|| true` so an empty/missing dir doesn't fail the ssh call.
  const cmd = `ls -1A ${shellQuote(remoteDir)} 2>/dev/null || true`;
  const out = await sshRun(r, cmd);
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function deleteRemoteFiles(
  r: UploadRemote,
  dir: string,
  filenames: string[],
): Promise<void> {
  if (filenames.length === 0) return;
  const remoteDir = `${r.dir}/${dir}`;
  // Quote each filename separately so spaces / special chars survive. We
  // generated the filenames ourselves so they're safe, but keep the quoting
  // for defense in depth.
  const args = filenames.map((f) => shellQuote(`${remoteDir}/${f}`)).join(" ");
  await sshRun(r, `rm -f ${args}`);
}

function writeRemote(
  buf: Buffer,
  r: UploadRemote,
  dir: string,
  filename: string,
): Promise<void> {
  // `dir` is from a fixed allowlist; `filename` is generated by us — both safe
  // for the shell. The quoting is belt-and-braces.
  const remoteDir = `${r.dir}/${dir}`;
  const remoteFile = `${remoteDir}/${filename}`;
  const remoteCmd = `mkdir -p ${shellQuote(remoteDir)} && cat > ${shellQuote(remoteFile)} && chmod 644 ${shellQuote(remoteFile)}`;
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      "ssh",
      [
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=10",
        `${r.user}@${r.host}`,
        remoteCmd,
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let stderr = "";
    child.stderr?.on("data", (c) => {
      stderr += String(c);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(new Error(`ssh exited ${code}: ${stderr.slice(0, 400).trim()}`));
    });
    child.stdin.end(buf);
  });
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
