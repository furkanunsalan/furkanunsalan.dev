import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

// Serves the vendored pdf.js worker with a correct JS MIME type. Next's
// standalone static handler 404s the `.mjs` in /public, so we stream it from
// disk here instead (the file ships with the deploy alongside the fonts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cached: Buffer | null = null;

export async function GET() {
  try {
    if (!cached) {
      cached = await readFile(
        path.join(process.cwd(), "public", "pdf.worker.min.mjs"),
      );
    }
    return new NextResponse(cached, {
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("[/pdf-worker] read failed:", e);
    return new NextResponse("worker unavailable", { status: 500 });
  }
}
