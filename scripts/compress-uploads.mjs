#!/usr/bin/env node
/**
 * Re-compress images that are already stored in UPLOADS_DIR.
 *
 * The problem this fixes: client-side compression (lib/image-compress.ts) only
 * ever ran on NEW uploads, so legacy files — e.g. a 4.75 MB camera JPEG — sat in
 * storage untouched and were streamed whole to the browser. The /api/img route
 * now serves resized derivatives on demand; this script shrinks the stored
 * originals too (so the fallback `src` and the lightbox aren't multi-megabyte).
 *
 * Safety:
 *   • dry run by default — nothing is written without `--apply`
 *   • before the first write it tars UPLOADS_DIR to a sibling .tar.gz and aborts
 *     if the backup fails
 *   • it never renames files (DB rows reference them by name) and never changes
 *     the format, so mime/extension stay consistent
 *   • a file is only replaced when the re-encode is actually smaller
 *   • idempotent: a second run finds nothing left to shrink
 *
 * Usage:
 *   node scripts/compress-uploads.mjs                  # dry run, report only
 *   node scripts/compress-uploads.mjs --apply          # back up, then write
 *   node scripts/compress-uploads.mjs --dir /uploads   # explicit uploads dir
 *   node scripts/compress-uploads.mjs --max-edge 2000 --min-bytes 32000
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

const apply = has("apply");
const uploadsDir = path.resolve(
  arg("dir", process.env.UPLOADS_DIR || path.join(root, ".uploads")),
);
const maxEdge = Number(arg("max-edge", "2200"));
const minBytes = Number(arg("min-bytes", String(64 * 1024)));

// Same cap the upload path and the /api/img derivatives use.
const DERIVABLE = new Set([".jpg", ".jpeg", ".png", ".webp"]);

async function* walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    // `.derived` holds the /api/img resize cache — regenerable, never originals.
    if (e.isDirectory()) {
      if (e.name === ".derived") continue;
      yield* walk(full);
    } else if (e.isFile()) {
      yield full;
    }
  }
}

async function recompress(abs) {
  const before = await fs.stat(abs);
  const meta = await sharp(abs, { failOn: "none" }).metadata();
  const longest = Math.max(meta.width ?? 0, meta.height ?? 0);

  let pipeline = sharp(abs, { failOn: "none" }).rotate().resize({
    width: maxEdge,
    height: maxEdge,
    fit: "inside",
    withoutEnlargement: true,
  });

  const ext = path.extname(abs).toLowerCase();
  if (ext === ".png") {
    pipeline = pipeline.png({ compressionLevel: 9, effort: 7 });
  } else if (ext === ".webp") {
    pipeline = pipeline.webp({ quality: 80, effort: 4 });
  } else {
    pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true, progressive: true });
  }

  const out = await pipeline.toBuffer();
  return {
    beforeBytes: before.size,
    afterBytes: out.length,
    longestBefore: longest,
    out,
  };
}

async function backup() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+$/, "");
  const dest = path.join(
    path.dirname(uploadsDir),
    `${path.basename(uploadsDir)}-backup-${stamp}.tar.gz`,
  );
  const res = spawnSync(
    "tar",
    ["-czf", dest, "-C", path.dirname(uploadsDir), path.basename(uploadsDir)],
    { stdio: "inherit" },
  );
  if (res.status !== 0) {
    throw new Error(
      `tar backup failed (exit ${res.status}) — refusing to write`,
    );
  }
  return dest;
}

const fmt = (n) => `${(n / 1024).toFixed(0)} KB`;

async function main() {
  console.log(`uploads dir : ${uploadsDir}`);
  console.log(
    `mode        : ${apply ? "APPLY" : "dry run (pass --apply to write)"}`,
  );
  console.log(`max edge    : ${maxEdge}px   min size: ${fmt(minBytes)}\n`);

  const rows = [];
  let scanned = 0;
  for await (const abs of walk(uploadsDir)) {
    if (!DERIVABLE.has(path.extname(abs).toLowerCase())) continue;
    const st = await fs.stat(abs);
    if (st.size < minBytes) continue;
    scanned++;
    try {
      const r = await recompress(abs);
      const saved = r.beforeBytes - r.afterBytes;
      rows.push({
        file: path.relative(uploadsDir, abs),
        ...r,
        saved,
        action: saved > 0 ? (apply ? "rewritten" : "would shrink") : "kept",
      });
    } catch (e) {
      rows.push({
        file: path.relative(uploadsDir, abs),
        beforeBytes: st.size,
        afterBytes: st.size,
        saved: 0,
        longestBefore: 0,
        out: null,
        action: `skipped (${e.message})`,
      });
    }
  }

  rows.sort((a, b) => b.saved - a.saved);
  const gainers = rows.filter((r) => r.saved > 0);
  const totalBefore = rows.reduce((n, r) => n + r.beforeBytes, 0);
  const totalAfter = rows.reduce((n, r) => n + r.afterBytes, 0);

  console.log(
    `${"file".padEnd(52)} ${"before".padStart(9)} ${"after".padStart(9)} ${"saved".padStart(9)}  action`,
  );
  for (const r of rows.slice(0, 40)) {
    console.log(
      `${r.file.padEnd(52).slice(0, 52)} ${fmt(r.beforeBytes).padStart(9)} ${fmt(
        r.afterBytes,
      ).padStart(9)} ${fmt(r.saved).padStart(9)}  ${r.action}`,
    );
  }
  if (rows.length > 40) console.log(`… ${rows.length - 40} more not shown`);

  console.log(
    `\nscanned ${scanned} files over ${fmt(minBytes)} · ${gainers.length} would shrink`,
  );
  console.log(
    `total ${fmt(totalBefore)} -> ${fmt(totalAfter)}  (saves ${fmt(totalBefore - totalAfter)}` +
      `${totalBefore ? `, ${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1)}%` : ""})`,
  );

  if (!apply) {
    console.log("\ndry run — nothing written. Re-run with --apply to rewrite.");
    return;
  }
  if (gainers.length === 0) {
    console.log("\nnothing to do.");
    return;
  }

  const backupPath = await backup();
  console.log(`\nbackup written: ${backupPath}`);
  let written = 0;
  for (const r of gainers) {
    const abs = path.join(uploadsDir, r.file);
    await fs.writeFile(abs, r.out);
    written++;
  }
  console.log(`rewrote ${written} files.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
