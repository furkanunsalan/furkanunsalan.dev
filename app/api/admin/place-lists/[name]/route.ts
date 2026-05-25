import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { ICON_KEYS } from "@/lib/place-list-icons";
import { revalidateCollection } from "@/lib/revalidate";

export const runtime = "nodejs";

const ICON_SET = new Set<string>(ICON_KEYS);

export async function PATCH(
  req: Request,
  { params }: { params: { name: string } },
) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const patch: Partial<typeof schema.placeLists.$inferInsert> & {
    updatedAt?: Date;
  } = { updatedAt: new Date() };
  if (typeof body.icon === "string" && ICON_SET.has(body.icon))
    patch.icon = body.icon;
  if (typeof body.position === "number") patch.position = body.position;
  try {
    const [row] = await db
      .update(schema.placeLists)
      .set(patch)
      .where(eq(schema.placeLists.name, params.name))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("placeLists");
    return NextResponse.json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "list");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { name: string } },
) {
  try {
    // Detach members first — places.list is a loose string, no FK to enforce.
    await db
      .update(schema.places)
      .set({ list: "", updatedAt: new Date() })
      .where(eq(schema.places.list, params.name));
    const [row] = await db
      .delete(schema.placeLists)
      .where(eq(schema.placeLists.name, params.name))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("placeLists");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "list");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
