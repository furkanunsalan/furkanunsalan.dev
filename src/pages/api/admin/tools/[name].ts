import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const prerender = false;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const CATS = new Set<string>(schema.toolCategoryEnum.enumValues);

export const GET: APIRoute = async ({ params }) => {
  const [row] = await db
    .select()
    .from(schema.tools)
    .where(eq(schema.tools.name, params.name!))
    .limit(1);
  if (!row) return json({ error: "not found" }, 404);
  return json({ row }, 200);
};

export const PATCH: APIRoute = async ({ request, params }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad json" }, 400);
  }
  const patch: Partial<typeof schema.tools.$inferInsert> & {
    updatedAt?: Date;
  } = { updatedAt: new Date() };
  if (typeof body.brand === "string") patch.brand = body.brand.trim();
  if (typeof body.what === "string") patch.what = body.what.trim();
  if (typeof body.category === "string" && CATS.has(body.category))
    patch.category =
      body.category as (typeof schema.toolCategoryEnum.enumValues)[number];
  if (typeof body.order === "number") patch.order = body.order;
  if (typeof body.comment === "string") patch.comment = body.comment;
  if (typeof body.favorite === "boolean") patch.favorite = body.favorite;
  if (typeof body.link === "string") patch.link = body.link || null;
  if (body.link === null) patch.link = null;
  if (typeof body.icon === "string") patch.icon = body.icon.trim() || null;
  if (body.icon === null) patch.icon = null;

  try {
    const [before] = await db
      .select()
      .from(schema.tools)
      .where(eq(schema.tools.name, params.name!))
      .limit(1);
    const [row] = await db
      .update(schema.tools)
      .set(patch)
      .where(eq(schema.tools.name, params.name!))
      .returning();
    if (!row) return json({ error: "not found" }, 404);
    revalidateCollection("tools");
    await recordAudit({
      req: request,
      action: "update",
      resource: "tool",
      rowId: params.name!,
      before: before as unknown as Record<string, unknown> | null,
      after: row as unknown as Record<string, unknown>,
    });
    return json({ row }, 200);
  } catch (e) {
    const f = friendlyDbError(e, "tool");
    return json({ error: f.error }, f.status);
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const [before] = await db
      .select()
      .from(schema.tools)
      .where(eq(schema.tools.name, params.name!))
      .limit(1);
    const [row] = await db
      .update(schema.tools)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.tools.name, params.name!))
      .returning();
    if (!row) return json({ error: "not found" }, 404);
    revalidateCollection("tools");
    await recordAudit({
      req: request,
      action: "delete",
      resource: "tool",
      rowId: params.name!,
      before: before as unknown as Record<string, unknown> | null,
      after: { deletedAt: row.deletedAt },
    });
    return json({ ok: true }, 200);
  } catch (e) {
    const f = friendlyDbError(e, "tool");
    return json({ error: f.error }, f.status);
  }
};
