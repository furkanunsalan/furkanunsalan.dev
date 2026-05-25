import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { cleanStringArray } from "@/lib/validators";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const id = parseId(params.id);
  if (id === null)
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  const [row] = await db
    .select()
    .from(schema.thoughts)
    .where(eq(schema.thoughts.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ row });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const id = parseId(params.id);
  if (id === null)
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const patch: Partial<typeof schema.thoughts.$inferInsert> & {
    updatedAt?: Date;
  } = { updatedAt: new Date() };
  if (typeof body.body === "string") patch.body = body.body;
  if (Array.isArray(body.images)) patch.images = cleanStringArray(body.images);
  if (Array.isArray(body.tags)) patch.tags = cleanStringArray(body.tags);
  if (typeof body.draft === "boolean") patch.draft = body.draft;

  try {
    const [before] = await db
      .select()
      .from(schema.thoughts)
      .where(eq(schema.thoughts.id, id))
      .limit(1);
    const [row] = await db
      .update(schema.thoughts)
      .set(patch)
      .where(eq(schema.thoughts.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("thoughts");
    await recordAudit({
      req,
      action: "update",
      resource: "thought",
      rowId: id,
      before: before as unknown as Record<string, unknown> | null,
      after: row as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "thought");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const id = parseId(params.id);
  if (id === null)
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  try {
    const [before] = await db
      .select()
      .from(schema.thoughts)
      .where(eq(schema.thoughts.id, id))
      .limit(1);
    const [row] = await db
      .update(schema.thoughts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.thoughts.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("thoughts");
    await recordAudit({
      req,
      action: "delete",
      resource: "thought",
      rowId: id,
      before: before as unknown as Record<string, unknown> | null,
      after: { deletedAt: row.deletedAt },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "thought");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
