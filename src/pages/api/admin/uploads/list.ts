import fs from "node:fs/promises";
import path from "node:path";
import type { APIRoute } from "astro";
import {
  UPLOADS_DIR,
  parseUploadRemote,
  sshRun,
  type UploadRemote,
} from "@/lib/uploads";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const DIRS = [
  "posts",
  "projects",
  "experiences",
  "places",
  "thoughts",
  "misc",
] as const;
type Dir = (typeof DIRS)[number];

type FileEntry = {
  name: string;
  url: string;
  size?: number;
  mtime?: string;
};

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function parseLsLine(line: string): {
  name: string;
  size?: number;
  mtime?: string;
} | null {
  // `ls -1Al --time-style=long-iso` lines look like:
  //   -rw-r--r-- 1 user grp 1234 2025-04-12 14:33 filename.png
  // We rely on --time-style=long-iso so the date format is predictable.
  if (!line || line.startsWith("total ")) return null;
  const parts = line.split(/\s+/);
  if (parts.length < 8) return null;
  if (!parts[0].startsWith("-")) return null; // only regular files
  const size = Number(parts[4]);
  const date = parts[5];
  const time = parts[6];
  const name = parts.slice(7).join(" ");
  if (!name) return null;
  const mtime =
    /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time)
      ? `${date}T${time}:00`
      : undefined;
  return {
    name,
    size: Number.isFinite(size) ? size : undefined,
    mtime,
  };
}

async function listRemoteDetailed(
  r: UploadRemote,
  dir: Dir,
): Promise<FileEntry[]> {
  const remoteDir = `${r.dir}/${dir}`;
  const cmd = `ls -1Al --time-style=long-iso ${shellQuote(remoteDir)} 2>/dev/null || true`;
  const out = await sshRun(r, cmd);
  const entries: FileEntry[] = [];
  for (const raw of out.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line) continue;
    const parsed = parseLsLine(line);
    if (!parsed) continue;
    if (parsed.name.startsWith(".")) continue;
    entries.push({
      name: parsed.name,
      url: `/api/img/${dir}/${parsed.name}`,
      size: parsed.size,
      mtime: parsed.mtime,
    });
  }
  return entries;
}

async function listLocalDetailed(dir: Dir): Promise<FileEntry[]> {
  const full = path.join(UPLOADS_DIR, dir);
  let names: string[] = [];
  try {
    const dirents = await fs.readdir(full, { withFileTypes: true });
    names = dirents.filter((d) => d.isFile()).map((d) => d.name);
  } catch (e: any) {
    if (e && e.code === "ENOENT") return [];
    throw e;
  }
  const out: FileEntry[] = [];
  for (const name of names) {
    if (name.startsWith(".")) continue;
    try {
      const st = await fs.stat(path.join(full, name));
      out.push({
        name,
        url: `/api/img/${dir}/${name}`,
        size: st.size,
        mtime: st.mtime.toISOString(),
      });
    } catch {
      out.push({ name, url: `/api/img/${dir}/${name}` });
    }
  }
  return out;
}

function sortEntries(entries: FileEntry[]): FileEntry[] {
  return entries.sort((a, b) => {
    if (a.mtime && b.mtime)
      return a.mtime < b.mtime ? 1 : a.mtime > b.mtime ? -1 : 0;
    if (a.mtime) return -1;
    if (b.mtime) return 1;
    return a.name.localeCompare(b.name);
  });
}

export const GET: APIRoute = async () => {
  const remote = parseUploadRemote();
  const target = remote
    ? `${remote.user}@${remote.host}:${remote.dir}`
    : UPLOADS_DIR;

  const dirs: Record<string, FileEntry[]> = {};
  for (const d of DIRS) {
    try {
      const entries = remote
        ? await listRemoteDetailed(remote, d)
        : await listLocalDetailed(d);
      dirs[d] = sortEntries(entries);
    } catch (e) {
      console.error(`[uploads/list] ${d} failed:`, e);
      dirs[d] = [];
    }
  }

  return json({ ok: true, target, dirs });
};
