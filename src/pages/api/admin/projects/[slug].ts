import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const GET: APIRoute = async ({ params }) => {
  const [row] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.slug, params.slug!))
    .limit(1);
  if (!row) return json({ error: "not found" }, 404);
  return json({ row });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad json" }, 400);
  }
  const patch: Partial<typeof schema.projects.$inferInsert> & {
    updatedAt?: Date;
  } = { updatedAt: new Date() };
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.description === "string")
    patch.description = body.description;
  if (typeof body.metric === "string") patch.metric = body.metric;
  if (typeof body.link === "string") patch.link = body.link;
  if (typeof body.language === "string") patch.language = body.language || null;
  if (body.language === null) patch.language = null;
  if (typeof body.order === "number") patch.order = body.order;
  if (typeof body.image === "string") patch.image = body.image || null;
  if (body.image === null) patch.image = null;
  if (typeof body.content === "string") patch.content = body.content;

  try {
    const [before] = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.slug, params.slug!))
      .limit(1);
    const [row] = await db
      .update(schema.projects)
      .set(patch)
      .where(eq(schema.projects.slug, params.slug!))
      .returning();
    if (!row) return json({ error: "not found" }, 404);
    revalidateCollection("projects", params.slug!);
    await recordAudit({
      req: request,
      action: "update",
      resource: "project",
      rowId: params.slug!,
      before: before as unknown as Record<string, unknown> | null,
      after: row as unknown as Record<string, unknown>,
    });
    return json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "project");
    return json({ error: f.error }, f.status);
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const [before] = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.slug, params.slug!))
      .limit(1);
    const [row] = await db
      .update(schema.projects)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.projects.slug, params.slug!))
      .returning();
    if (!row) return json({ error: "not found" }, 404);
    revalidateCollection("projects", params.slug!);
    await recordAudit({
      req: request,
      action: "delete",
      resource: "project",
      rowId: params.slug!,
      before: before as unknown as Record<string, unknown> | null,
      after: { deletedAt: row.deletedAt },
    });
    return json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "project");
    return json({ error: f.error }, f.status);
  }
};
