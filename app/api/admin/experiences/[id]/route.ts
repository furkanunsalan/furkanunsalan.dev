import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { cleanLinks, cleanStringArray } from "@/lib/validators";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const [row] = await db
    .select()
    .from(schema.experiences)
    .where(eq(schema.experiences.id, params.id))
    .limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ row });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const patch: Partial<typeof schema.experiences.$inferInsert> & {
    updatedAt?: Date;
  } = { updatedAt: new Date() };
  if (typeof body.order === "number") patch.order = body.order;
  if (typeof body.organization === "string")
    patch.organization = body.organization.trim();
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.startDate === "string") patch.startDate = body.startDate;
  if (typeof body.endDate === "string" || body.endDate === null)
    patch.endDate = body.endDate || null;
  if (typeof body.comment === "string") patch.comment = body.comment;
  if (typeof body.logo === "string") patch.logo = body.logo.trim() || null;
  if (Array.isArray(body.links)) patch.links = cleanLinks(body.links);
  if (Array.isArray(body.images)) patch.images = cleanStringArray(body.images);

  try {
    const [before] = await db
      .select()
      .from(schema.experiences)
      .where(eq(schema.experiences.id, params.id))
      .limit(1);
    const [row] = await db
      .update(schema.experiences)
      .set(patch)
      .where(eq(schema.experiences.id, params.id))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("experiences");
    await recordAudit({
      req,
      action: "update",
      resource: "experience",
      rowId: params.id,
      before: before as unknown as Record<string, unknown> | null,
      after: row as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "experience");
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
      .from(schema.experiences)
      .where(eq(schema.experiences.id, params.id))
      .limit(1);
    const [row] = await db
      .update(schema.experiences)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.experiences.id, params.id))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("experiences");
    await recordAudit({
      req,
      action: "delete",
      resource: "experience",
      rowId: params.id,
      before: before as unknown as Record<string, unknown> | null,
      after: { deletedAt: row.deletedAt },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "experience");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
