import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { slugifyAscii, cleanUserSlug } from "@/lib/slugify";
import { revalidateCollection } from "@/lib/revalidate";
import { cleanLinks, cleanStringArray } from "@/lib/validators";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const rows = await db
    .select()
    .from(schema.experiences)
    .orderBy(asc(schema.experiences.order));
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const title = (body.title || "").trim();
  const organization = (body.organization || "").trim();
  if (!title || !organization) {
    return NextResponse.json(
      { error: "title and organization required" },
      { status: 400 },
    );
  }
  const id =
    cleanUserSlug(body.id) ||
    slugifyAscii(`${organization}-${title}`, "experience");
  const startDate = body.startDate || new Date().toISOString().slice(0, 10);

  try {
    const [row] = await db
      .insert(schema.experiences)
      .values({
        id,
        order: typeof body.order === "number" ? body.order : 100,
        organization,
        title,
        startDate,
        endDate: body.endDate || null,
        comment: body.comment ?? "",
        links: cleanLinks(body.links),
        images: cleanStringArray(body.images),
      })
      .returning();
    revalidateCollection("experiences");
    await recordAudit({
      req,
      action: "create",
      resource: "experience",
      rowId: id,
      after: row as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ row }, { status: 201 });
  } catch (e) {
    const f = friendlyDbError(e, "experience");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
