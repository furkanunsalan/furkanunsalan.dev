import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { UPLOADS_DIR, parseUploadRemote, sshRun } from "@/lib/uploads";

export const runtime = "nodejs";

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

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  const dir = String(body?.dir ?? "");
  const name = String(body?.name ?? "");

  if (!ALLOWED_DIRS.has(dir)) {
    return NextResponse.json({ error: `bad dir "${dir}"` }, { status: 400 });
  }
  if (badName(name)) {
    return NextResponse.json({ error: `bad name "${name}"` }, { status: 400 });
  }

  const remote = parseUploadRemote();
  if (remote) {
    try {
      const remotePath = `${remote.dir}/${dir}/${name}`;
      await sshRun(remote, `rm -f ${shellQuote(remotePath)}`);
    } catch (e) {
      return NextResponse.json(
        { error: `remote delete failed: ${(e as Error).message}` },
        { status: 502 },
      );
    }
  } else {
    try {
      await fs.unlink(path.join(UPLOADS_DIR, dir, name));
    } catch (e: any) {
      if (e?.code !== "ENOENT") {
        return NextResponse.json(
          { error: e?.message ?? String(e) },
          { status: 500 },
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
