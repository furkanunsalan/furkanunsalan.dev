import fs from "node:fs/promises";
import { resolveServePath, mimeFor } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { path: string[] } },
) {
  const abs = resolveServePath(params.path);
  const filename = params.path[params.path.length - 1];
  if (abs) {
    try {
      const buf = await fs.readFile(abs);
      return new Response(buf, {
        status: 200,
        headers: {
          "content-type": mimeFor(filename),
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      // fall through to optional proxy
    }
  }

  // Dev-only fallback: when uploads land on a remote host (UPLOAD_REMOTE set),
  // local previewing 404s because the file never touched local disk. Setting
  // UPLOAD_PROXY_URL=https://furkanunsalan.dev lets the dev server fetch the
  // missing file from prod and stream it back.
  const proxyBase = process.env.UPLOAD_PROXY_URL;
  if (proxyBase) {
    try {
      const remoteUrl = `${proxyBase.replace(/\/$/, "")}/api/img/${params.path
        .map(encodeURIComponent)
        .join("/")}`;
      const r = await fetch(remoteUrl, { cache: "no-store" });
      if (r.ok) {
        return new Response(r.body, {
          status: 200,
          headers: {
            "content-type": r.headers.get("content-type") || mimeFor(filename),
            "cache-control": "public, max-age=300",
          },
        });
      }
    } catch (e) {
      console.error("[/api/img] proxy fallback failed:", e);
    }
  }
  return new Response("not found", { status: 404 });
}
