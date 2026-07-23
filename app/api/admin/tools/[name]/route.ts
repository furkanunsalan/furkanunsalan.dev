import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const CATS = new Set<string>(schema.toolCategoryEnum.enumValues);

export async function GET(
  _req: Request,
  { params }: { params: { name: string } },
) {
  const [row] = await db
    .select()
    .from(schema.tools)
    .where(eq(schema.tools.name, params.name))
    .limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ row });
}

export async function PATCH(
  req: Request,
  { params }: { params: { name: string } },
) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
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
      .where(eq(schema.tools.name, params.name))
      .limit(1);
    const [row] = await db
      .update(schema.tools)
      .set(patch)
      .where(eq(schema.tools.name, params.name))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("tools");
    await recordAudit({
      req,
      action: "update",
      resource: "tool",
      rowId: params.name,
      before: before as unknown as Record<string, unknown> | null,
      after: row as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "tool");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { name: string } },
) {
  try {
    const [before] = await db
      .select()
      .from(schema.tools)
      .where(eq(schema.tools.name, params.name))
      .limit(1);
    const [row] = await db
      .update(schema.tools)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.tools.name, params.name))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("tools");
    await recordAudit({
      req,
      action: "delete",
      resource: "tool",
      rowId: params.name,
      before: before as unknown as Record<string, unknown> | null,
      after: { deletedAt: row.deletedAt },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "tool");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
