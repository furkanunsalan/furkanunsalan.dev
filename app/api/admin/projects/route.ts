import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { slugifyAscii, cleanUserSlug } from "@/lib/slugify";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const rows = await db
    .select()
    .from(schema.projects)
    .orderBy(asc(schema.projects.order));
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const name = (body.name || "").trim();
  if (!name)
    return NextResponse.json({ error: "name required" }, { status: 400 });
  const slug = cleanUserSlug(body.slug) || slugifyAscii(name, "project");

  try {
    const [row] = await db
      .insert(schema.projects)
      .values({
        slug,
        name,
        description: body.description ?? "",
        metric: body.metric ?? "",
        link: body.link ?? "",
        language: body.language || null,
        order: typeof body.order === "number" ? body.order : 100,
        image: body.image || null,
        content: body.content ?? "",
      })
      .returning();
    revalidateCollection("projects", slug);
    await recordAudit({
      req,
      action: "create",
      resource: "project",
      rowId: slug,
      after: row as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ row }, { status: 201 });
  } catch (e) {
    const f = friendlyDbError(e, "project");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
