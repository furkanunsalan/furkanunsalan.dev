import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { resolvePlaceUrl } from "@/lib/place-resolve";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const result = await resolvePlaceUrl(body.url || "");
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  // Collision detection: if a place with the suggested slug already exists,
  // surface it so the user can jump to edit instead of fighting a 409 on save.
  const [existing] = await db
    .select({ slug: schema.places.slug, name: schema.places.name })
    .from(schema.places)
    .where(eq(schema.places.slug, result.suggestedSlug))
    .limit(1);

  const { ok, ...payload } = result;
  void ok;
  return NextResponse.json({ ...payload, existing: existing || null });
}
