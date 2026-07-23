import fs from "node:fs/promises";
import path from "node:path";
import type { APIRoute } from "astro";
import {
  UPLOADS_DIR,
  parseUploadRemote,
  listRemoteFiles,
  deleteRemoteFiles,
} from "@/lib/uploads";
import { UPLOAD_DIRS, type UploadDir, referencedByDir } from "@/lib/uploadRefs";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

type DirReport = {
  kept: number;
  deleted: string[];
  errors: { file: string; error: string }[];
};

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

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const dryRun = body && body.dryRun !== false; // default to dry-run unless explicitly disabled

  const referenced = await referencedByDir();
  const remote = parseUploadRemote();

  const report: Record<UploadDir, DirReport> = {
    posts: { kept: 0, deleted: [], errors: [] },
    projects: { kept: 0, deleted: [], errors: [] },
    experiences: { kept: 0, deleted: [], errors: [] },
    places: { kept: 0, deleted: [], errors: [] },
    thoughts: { kept: 0, deleted: [], errors: [] },
    misc: { kept: 0, deleted: [], errors: [] },
  };

  for (const dir of UPLOAD_DIRS) {
    const files = remote
      ? await listRemoteFiles(remote, dir).catch((e) => {
          report[dir].errors.push({
            file: "(list)",
            error: (e as Error).message,
          });
          return [] as string[];
        })
      : await listLocalFiles(dir);
    const refSet = referenced[dir];
    const candidates: string[] = [];
    for (const f of files) {
      if (refSet.has(f)) report[dir].kept++;
      else candidates.push(f);
    }
    report[dir].deleted = candidates;

    if (!dryRun && candidates.length > 0) {
      if (remote) {
        try {
          await deleteRemoteFiles(remote, dir, candidates);
        } catch (e) {
          report[dir].errors.push({
            file: "(rm)",
            error: (e as Error).message,
          });
        }
      } else {
        for (const f of candidates) {
          try {
            await fs.unlink(path.join(UPLOADS_DIR, dir, f));
          } catch (e: any) {
            report[dir].errors.push({
              file: f,
              error: e?.message ?? String(e),
            });
          }
        }
      }
    }
  }

  const totalDeleted = UPLOAD_DIRS.reduce(
    (n, d) => n + report[d].deleted.length,
    0,
  );
  const totalKept = UPLOAD_DIRS.reduce((n, d) => n + report[d].kept, 0);

  return json({
    ok: true,
    dryRun,
    target: remote
      ? `${remote.user}@${remote.host}:${remote.dir}`
      : UPLOADS_DIR,
    totals: { kept: totalKept, deleted: totalDeleted },
    report,
  });
};
