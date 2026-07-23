import fs from "node:fs/promises";
import path from "node:path";
import type { APIRoute } from "astro";
import { UPLOADS_DIR, parseUploadRemote, listRemoteFiles } from "@/lib/uploads";
import { UPLOAD_DIRS, type UploadDir, buildUsageMap } from "@/lib/uploadRefs";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

async function listLocalFiles(dir: UploadDir): Promise<string[]> {
  const full = path.join(UPLOADS_DIR, dir);
  try {
    const entries = await fs.readdir(full, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name);
  } catch (e: any) {
    if (e && e.code === "ENOENT") return [];
    throw e;
  }
}

export const GET: APIRoute = async () => {
  const remote = parseUploadRemote();
  const filesByDir: Record<UploadDir, string[]> = {
    posts: [],
    projects: [],
    experiences: [],
    places: [],
    thoughts: [],
    misc: [],
  };

  for (const dir of UPLOAD_DIRS) {
    try {
      filesByDir[dir] = remote
        ? await listRemoteFiles(remote, dir)
        : await listLocalFiles(dir);
    } catch (e) {
      console.error(`uploads/usage: list ${dir} failed`, e);
      filesByDir[dir] = [];
    }
  }

  const { fileRefs, rowAssets, orphans } = await buildUsageMap(filesByDir);

  return json({
    ok: true,
    target: remote
      ? `${remote.user}@${remote.host}:${remote.dir}`
      : UPLOADS_DIR,
    fileRefs,
    rowAssets,
    orphans,
  });
};
