import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { slugifyAscii, cleanUserSlug } from "@/lib/slugify";
import { excerptFromMarkdoc } from "@/lib/excerpt";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const rows = await db
    .select()
    .from(schema.posts)
    .orderBy(desc(schema.posts.date));
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const title = (body.title || "").trim();
  if (!title)
    return NextResponse.json({ error: "title required" }, { status: 400 });
  const date = body.date || new Date().toISOString().slice(0, 10);
  const slug = cleanUserSlug(body.slug) || slugifyAscii(title, "post");
  const content = body.content ?? "";
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t: unknown) => typeof t === "string" && t.length > 0)
    : [];

  try {
    const [row] = await db
      .insert(schema.posts)
      .values({
        slug,
        title,
        date,
        tags,
        banner: body.banner || null,
        content,
        excerpt: excerptFromMarkdoc(content),
        draft: !!body.draft,
      })
      .returning();
    revalidateCollection("posts", slug);
    await recordAudit({
      req,
      action: "create",
      resource: "post",
      rowId: slug,
      after: row as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ row }, { status: 201 });
  } catch (e) {
    const f = friendlyDbError(e, "post");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
