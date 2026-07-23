import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";
import { deletePhotoVariants } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const [row] = await db
    .select()
    .from(schema.photos)
    .where(eq(schema.photos.id, params.id))
    .limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ row });
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);
const nullableStr = (v: unknown) =>
  typeof v === "string" ? v.trim() || null : v === null ? null : undefined;

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
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
      .where(eq(schema.photos.id, params.id))
      .limit(1);
    const [row] = await db
      .update(schema.photos)
      .set(patch)
      .where(eq(schema.photos.id, params.id))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("photos");
    await recordAudit({
      req,
      action: "update",
      resource: "photo",
      rowId: params.id,
      before: before as unknown as Record<string, unknown> | null,
      after: row as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "photo");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const [before] = await db
      .select()
      .from(schema.photos)
      .where(eq(schema.photos.id, params.id))
      .limit(1);
    if (!before)
      return NextResponse.json({ error: "not found" }, { status: 404 });
    await db.delete(schema.photos).where(eq(schema.photos.id, params.id));
    await deletePhotoVariants(params.id);
    revalidateCollection("photos");
    await recordAudit({
      req,
      action: "delete",
      resource: "photo",
      rowId: params.id,
      before: before as unknown as Record<string, unknown> | null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "photo");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
