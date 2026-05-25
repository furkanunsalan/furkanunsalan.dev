import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { excerptFromMarkdoc } from "@/lib/excerpt";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const [row] = await db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.slug, params.slug))
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
  const patch: Partial<typeof schema.posts.$inferInsert> & {
    updatedAt?: Date;
  } = {
    updatedAt: new Date(),
  };
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.date === "string") patch.date = body.date;
  if (Array.isArray(body.tags))
    patch.tags = body.tags.filter(
      (t: unknown) => typeof t === "string" && t.length > 0,
    );
  if (typeof body.banner === "string") patch.banner = body.banner || null;
  if (body.banner === null) patch.banner = null;
  if (typeof body.content === "string") {
    patch.content = body.content;
    patch.excerpt = excerptFromMarkdoc(body.content);
  }
  if (typeof body.draft === "boolean") patch.draft = body.draft;

  try {
    const [before] = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.slug, params.slug))
      .limit(1);
    const [row] = await db
      .update(schema.posts)
      .set(patch)
      .where(eq(schema.posts.slug, params.slug))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("posts", params.slug);
    await recordAudit({
      req,
      action: "update",
      resource: "post",
      rowId: params.slug,
      before: before as unknown as Record<string, unknown> | null,
      after: row as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "post");
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
      .from(schema.posts)
      .where(eq(schema.posts.slug, params.slug))
      .limit(1);
    const [row] = await db
      .update(schema.posts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.posts.slug, params.slug))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("posts", params.slug);
    await recordAudit({
      req,
      action: "delete",
      resource: "post",
      rowId: params.slug,
      before: before as unknown as Record<string, unknown> | null,
      after: { deletedAt: row.deletedAt },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "post");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
