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

const STATUSES = new Set<string>(schema.placeStatusEnum.enumValues);

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug ?? "";
  const [row] = await db
    .select()
    .from(schema.places)
    .where(eq(schema.places.slug, slug))
    .limit(1);
  if (!row) return json({ error: "not found" }, 404);
  return json({ row });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  const slug = params.slug ?? "";
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad json" }, 400);
  }
  const patch: Partial<typeof schema.places.$inferInsert> & {
    updatedAt?: Date;
  } = { updatedAt: new Date() };
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.lat === "number") patch.lat = body.lat;
  if (typeof body.lng === "number") patch.lng = body.lng;
  if (typeof body.address === "string") patch.address = body.address;
  if (typeof body.list === "string") patch.list = body.list;
  if (typeof body.category === "string") patch.category = body.category;
  if (typeof body.country === "string") patch.country = body.country;
  if (typeof body.city === "string") patch.city = body.city;
  if (typeof body.status === "string" && STATUSES.has(body.status)) {
    patch.status =
      body.status as (typeof schema.placeStatusEnum.enumValues)[number];
  }
  if (typeof body.sourceUrl === "string")
    patch.sourceUrl = body.sourceUrl || null;
  if (typeof body.notes === "string") patch.notes = body.notes;
  if (Array.isArray(body.tags))
    patch.tags = body.tags
      .filter((t: unknown) => typeof t === "string" && t.length > 0)
      .slice(0, 3);
  if (body.addedAt) patch.addedAt = new Date(body.addedAt);

  try {
    const [before] = await db
      .select()
      .from(schema.places)
      .where(eq(schema.places.slug, slug))
      .limit(1);
    const [row] = await db
      .update(schema.places)
      .set(patch)
      .where(eq(schema.places.slug, slug))
      .returning();
    if (!row) return json({ error: "not found" }, 404);
    revalidateCollection("places");
    await recordAudit({
      req: request,
      action: "update",
      resource: "place",
      rowId: slug,
      before: before as unknown as Record<string, unknown> | null,
      after: row as unknown as Record<string, unknown>,
    });
    return json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "place");
    return json({ error: f.error }, f.status);
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const slug = params.slug ?? "";
  try {
    const [before] = await db
      .select()
      .from(schema.places)
      .where(eq(schema.places.slug, slug))
      .limit(1);
    const [row] = await db
      .update(schema.places)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.places.slug, slug))
      .returning();
    if (!row) return json({ error: "not found" }, 404);
    revalidateCollection("places");
    await recordAudit({
      req: request,
      action: "delete",
      resource: "place",
      rowId: slug,
      before: before as unknown as Record<string, unknown> | null,
      after: { deletedAt: row.deletedAt },
    });
    return json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "place");
    return json({ error: f.error }, f.status);
  }
};
