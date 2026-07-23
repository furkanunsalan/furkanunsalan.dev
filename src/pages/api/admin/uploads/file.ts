import fs from "node:fs/promises";
import path from "node:path";
import type { APIRoute } from "astro";
import { UPLOADS_DIR, parseUploadRemote, sshRun } from "@/lib/uploads";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const ALLOWED_DIRS = new Set([
  "posts",
  "projects",
  "experiences",
  "places",
  "thoughts",
  "misc",
]);

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function badName(name: string): boolean {
  return (
    !name || name.includes("/") || name.includes("\\") || name.startsWith(".")
  );
}

export const DELETE: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const dir = String(body?.dir ?? "");
  const name = String(body?.name ?? "");

  if (!ALLOWED_DIRS.has(dir)) {
    return json({ error: `bad dir "${dir}"` }, 400);
  }
  if (badName(name)) {
    return json({ error: `bad name "${name}"` }, 400);
  }

  const remote = parseUploadRemote();
  if (remote) {
    try {
      const remotePath = `${remote.dir}/${dir}/${name}`;
      await sshRun(remote, `rm -f ${shellQuote(remotePath)}`);
    } catch (e) {
      return json(
        { error: `remote delete failed: ${(e as Error).message}` },
        502,
      );
    }
  } else {
    try {
      await fs.unlink(path.join(UPLOADS_DIR, dir, name));
    } catch (e: any) {
      if (e?.code !== "ENOENT") {
        return json({ error: e?.message ?? String(e) }, 500);
      }
    }
  }

  return json({ ok: true });
};
