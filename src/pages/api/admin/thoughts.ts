import type { APIRoute } from "astro";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { cleanStringArray } from "@/lib/validators";
import { recordAudit } from "@/lib/audit";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const GET: APIRoute = async () => {
  const rows = await db
    .select()
    .from(schema.thoughts)
    .orderBy(desc(schema.thoughts.createdAt));
  return json({ rows });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad json" }, 400);
  }
  const text = typeof body.body === "string" ? body.body : "";
  const images = cleanStringArray(body.images);
  if (!text.trim() && images.length === 0) {
    return json({ error: "body or at least one image required" }, 400);
  }

  try {
    const [row] = await db
      .insert(schema.thoughts)
      .values({
        body: text,
        images,
        tags: cleanStringArray(body.tags),
        draft: !!body.draft,
      })
      .returning();
    revalidateCollection("thoughts");
    await recordAudit({
      req: request,
      action: "create",
      resource: "thought",
      rowId: row.id,
      after: row as unknown as Record<string, unknown>,
    });
    return json({ row }, 201);
  } catch (e) {
    const f = friendlyDbError(e, "thought");
    return json({ error: f.error }, f.status);
  }
};
