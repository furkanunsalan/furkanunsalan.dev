import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
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

function parseId(raw: string | undefined): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export const GET: APIRoute = async ({ params }) => {
  const id = parseId(params.id);
  if (id === null) return json({ error: "bad id" }, 400);
  const [row] = await db
    .select()
    .from(schema.thoughts)
    .where(eq(schema.thoughts.id, id))
    .limit(1);
  if (!row) return json({ error: "not found" }, 404);
  return json({ row });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  const id = parseId(params.id);
  if (id === null) return json({ error: "bad id" }, 400);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad json" }, 400);
  }
  const patch: Partial<typeof schema.thoughts.$inferInsert> & {
    updatedAt?: Date;
  } = { updatedAt: new Date() };
  if (typeof body.body === "string") patch.body = body.body;
  if (Array.isArray(body.images)) patch.images = cleanStringArray(body.images);
  if (Array.isArray(body.tags)) patch.tags = cleanStringArray(body.tags);
  if (typeof body.draft === "boolean") patch.draft = body.draft;

  try {
    const [before] = await db
      .select()
      .from(schema.thoughts)
      .where(eq(schema.thoughts.id, id))
      .limit(1);
    const [row] = await db
      .update(schema.thoughts)
      .set(patch)
      .where(eq(schema.thoughts.id, id))
      .returning();
    if (!row) return json({ error: "not found" }, 404);
    revalidateCollection("thoughts");
    await recordAudit({
      req: request,
      action: "update",
      resource: "thought",
      rowId: id,
      before: before as unknown as Record<string, unknown> | null,
      after: row as unknown as Record<string, unknown>,
    });
    return json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "thought");
    return json({ error: f.error }, f.status);
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const id = parseId(params.id);
  if (id === null) return json({ error: "bad id" }, 400);
  try {
    const [before] = await db
      .select()
      .from(schema.thoughts)
      .where(eq(schema.thoughts.id, id))
      .limit(1);
    const [row] = await db
      .update(schema.thoughts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.thoughts.id, id))
      .returning();
    if (!row) return json({ error: "not found" }, 404);
    revalidateCollection("thoughts");
    await recordAudit({
      req: request,
      action: "delete",
      resource: "thought",
      rowId: id,
      before: before as unknown as Record<string, unknown> | null,
      after: { deletedAt: row.deletedAt },
    });
    return json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "thought");
    return json({ error: f.error }, f.status);
  }
};
