import fs from "node:fs/promises";
import { resolveServePath, mimeFor } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { path: string[] } },
) {
  const abs = resolveServePath(params.path);
  if (!abs) return new Response("not found", { status: 404 });
  try {
    const buf = await fs.readFile(abs);
    const filename = params.path[params.path.length - 1];
    return new Response(buf, {
      status: 200,
      headers: {
        "content-type": mimeFor(filename),
        // Browsers cache aggressively; uploads have random prefixes so the
        // URL changes whenever the file does.
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
