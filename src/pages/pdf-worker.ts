import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const prerender = false;

let cached: Buffer | null = null;

// Serves the vendored pdf.js worker with a correct JS MIME type.
export const GET: APIRoute = async () => {
  try {
    if (!cached) {
      cached = await readFile(
        path.join(process.cwd(), "public", "pdf.worker.min.mjs"),
      );
    }
    return new Response(cached, {
      headers: {
        "content-type": "text/javascript; charset=utf-8",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("[/pdf-worker] read failed:", e);
    return new Response("worker unavailable", { status: 500 });
  }
};
