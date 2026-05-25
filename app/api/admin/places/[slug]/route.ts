import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";

export const runtime = "nodejs";

const STATUSES = new Set<string>(schema.placeStatusEnum.enumValues);

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const [row] = await db
    .select()
    .from(schema.places)
    .where(eq(schema.places.slug, params.slug))
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
  const patch: Partial<typeof schema.places.$inferInsert> & {
    updatedAt?: Date;
  } = { updatedAt: new Date() };
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.lat === "number") patch.lat = body.lat;
  if (typeof body.lng === "number") patch.lng = body.lng;
  if (typeof body.address === "string") patch.address = body.address;
  if (typeof body.list === "string") patch.list = body.list;
  if (typeof body.category === "string") patch.category = body.category;
  if (typeof body.country === "string") patch.country = body.country;
  if (typeof body.city === "string") patch.city = body.city;
  if (typeof body.status === "string" && STATUSES.has(body.status)) {
    patch.status =
      body.status as (typeof schema.placeStatusEnum.enumValues)[number];
  }
  if (typeof body.sourceUrl === "string")
    patch.sourceUrl = body.sourceUrl || null;
  if (typeof body.notes === "string") patch.notes = body.notes;
  if (Array.isArray(body.tags))
    patch.tags = body.tags
      .filter((t: unknown) => typeof t === "string" && t.length > 0)
      .slice(0, 3);
  if (body.addedAt) patch.addedAt = new Date(body.addedAt);

  try {
    const [row] = await db
      .update(schema.places)
      .set(patch)
      .where(eq(schema.places.slug, params.slug))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("places");
    return NextResponse.json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "place");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  try {
    const [row] = await db
      .delete(schema.places)
      .where(eq(schema.places.slug, params.slug))
      .returning();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    revalidateCollection("places");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "place");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
