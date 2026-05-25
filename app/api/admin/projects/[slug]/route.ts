import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const [row] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.slug, params.slug))
    .limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ row });
}

export async function PATCH(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
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
      .where(eq(schema.projects.slug, params.slug))
      .limit(1);
    const [row] = await db
      .update(schema.projects)
      .set(patch)
      .where(eq(schema.projects.slug, params.slug))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("projects", params.slug);
    await recordAudit({
      req,
      action: "update",
      resource: "project",
      rowId: params.slug,
      before: before as unknown as Record<string, unknown> | null,
      after: row as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "project");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { slug: string } },
) {
  try {
    const [before] = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.slug, params.slug))
      .limit(1);
    const [row] = await db
      .update(schema.projects)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.projects.slug, params.slug))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("projects", params.slug);
    await recordAudit({
      req,
      action: "delete",
      resource: "project",
      rowId: params.slug,
      before: before as unknown as Record<string, unknown> | null,
      after: { deletedAt: row.deletedAt },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "project");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
