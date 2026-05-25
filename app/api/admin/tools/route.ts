import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { slugifyAscii, cleanUserSlug } from "@/lib/slugify";
import { revalidateCollection } from "@/lib/revalidate";

export const runtime = "nodejs";

const CATS = new Set<string>(schema.toolCategoryEnum.enumValues);

export async function GET() {
  const rows = await db
    .select()
    .from(schema.tools)
    .orderBy(asc(schema.tools.name));
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const what = (body.what || "").trim();
  const brand = (body.brand || "").trim();
  if (!what)
    return NextResponse.json({ error: "what required" }, { status: 400 });
  const name =
    cleanUserSlug(body.name) || slugifyAscii(`${brand}-${what}`, "tool");
  const category = CATS.has(body.category) ? body.category : "tech";

  try {
    const [row] = await db
      .insert(schema.tools)
      .values({
        name,
        brand,
        what,
        category,
        comment: body.comment ?? "",
        favorite: !!body.favorite,
        link: body.link || null,
      })
      .returning();
    revalidateCollection("tools");
    return NextResponse.json({ row }, { status: 201 });
  } catch (e) {
    const f = friendlyDbError(e, "tool");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
