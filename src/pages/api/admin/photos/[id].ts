import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";
import { deletePhotoVariants } from "@/lib/uploads";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const GET: APIRoute = async ({ params }) => {
  const id = params.id!;
  const [row] = await db
    .select()
    .from(schema.photos)
    .where(eq(schema.photos.id, id))
    .limit(1);
  if (!row) return json({ error: "not found" }, 404);
  return json({ row });
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);
const nullableStr = (v: unknown) =>
  typeof v === "string" ? v.trim() || null : v === null ? null : undefined;

export const PATCH: APIRoute = async ({ request, params }) => {
  const id = params.id!;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad json" }, 400);
  }
  const patch: Partial<typeof schema.photos.$inferInsert> & {
    updatedAt?: Date;
  } = { updatedAt: new Date() };

  if (typeof body.order === "number") patch.order = body.order;
  if (str(body.alt) !== undefined) patch.alt = str(body.alt);
  if (str(body.caption) !== undefined) patch.caption = str(body.caption);
  if (nullableStr(body.cameraMake) !== undefined)
    patch.cameraMake = nullableStr(body.cameraMake);
  if (nullableStr(body.cameraModel) !== undefined)
    patch.cameraModel = nullableStr(body.cameraModel);
  if (nullableStr(body.focalLength) !== undefined)
    patch.focalLength = nullableStr(body.focalLength);
  if (nullableStr(body.aperture) !== undefined)
    patch.aperture = nullableStr(body.aperture);
  if (nullableStr(body.shutter) !== undefined)
    patch.shutter = nullableStr(body.shutter);
  if (typeof body.iso === "number") patch.iso = Math.round(body.iso);
  else if (body.iso === null || body.iso === "") patch.iso = null;
  if (body.takenAt === null || body.takenAt === "") patch.takenAt = null;
  else if (typeof body.takenAt === "string") {
    const d = new Date(body.takenAt);
    if (!isNaN(d.getTime())) patch.takenAt = d;
  }
  if (Array.isArray(body.tags)) {
    patch.tags = body.tags
      .filter((t: unknown) => typeof t === "string" && t.trim().length > 0)
      .map((t: string) => t.trim())
      .slice(0, 12);
  }

  try {
    const [before] = await db
      .select()
      .from(schema.photos)
      .where(eq(schema.photos.id, id))
      .limit(1);
    const [row] = await db
      .update(schema.photos)
      .set(patch)
      .where(eq(schema.photos.id, id))
      .returning();
    if (!row) return json({ error: "not found" }, 404);
    revalidateCollection("photos");
    await recordAudit({
      req: request,
      action: "update",
      resource: "photo",
      rowId: id,
      before: before as unknown as Record<string, unknown> | null,
      after: row as unknown as Record<string, unknown>,
    });
    return json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "photo");
    return json({ error: f.error }, f.status);
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const id = params.id!;
  try {
    const [before] = await db
      .select()
      .from(schema.photos)
      .where(eq(schema.photos.id, id))
      .limit(1);
    if (!before) return json({ error: "not found" }, 404);
    await db.delete(schema.photos).where(eq(schema.photos.id, id));
    await deletePhotoVariants(id);
    revalidateCollection("photos");
    await recordAudit({
      req: request,
      action: "delete",
      resource: "photo",
      rowId: id,
      before: before as unknown as Record<string, unknown> | null,
    });
    return json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "photo");
    return json({ error: f.error }, f.status);
  }
};
