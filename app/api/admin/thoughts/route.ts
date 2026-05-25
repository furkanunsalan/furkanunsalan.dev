import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { cleanStringArray } from "@/lib/validators";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(schema.thoughts)
    .orderBy(desc(schema.thoughts.createdAt));
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const text = typeof body.body === "string" ? body.body : "";
  const images = cleanStringArray(body.images);
  if (!text.trim() && images.length === 0) {
    return NextResponse.json(
      { error: "body or at least one image required" },
      { status: 400 },
    );
  }

  try {
    const [row] = await db
      .insert(schema.thoughts)
      .values({
        body: text,
        images,
        tags: cleanStringArray(body.tags),
        draft: !!body.draft,
      })
      .returning();
    revalidateCollection("thoughts");
    await recordAudit({
      req,
      action: "create",
      resource: "thought",
      rowId: row.id,
      after: row as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ row }, { status: 201 });
  } catch (e) {
    const f = friendlyDbError(e, "thought");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
