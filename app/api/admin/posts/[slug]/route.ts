import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { excerptFromMarkdoc } from "@/lib/excerpt";
import { revalidateCollection } from "@/lib/revalidate";

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

  try {
    const [row] = await db
      .update(schema.posts)
      .set(patch)
      .where(eq(schema.posts.slug, params.slug))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("posts", params.slug);
    return NextResponse.json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "post");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  try {
    const [row] = await db
      .delete(schema.posts)
      .where(eq(schema.posts.slug, params.slug))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("posts", params.slug);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "post");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
