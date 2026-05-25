import { NextResponse } from "next/server";
import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";

export const runtime = "nodejs";

type Kind = "category" | "list" | "tag";

export async function GET() {
  try {
    const [catRows, listRows, placeTagRows, postTagRows, thoughtTagRows] =
      await Promise.all([
        db
          .selectDistinct({ v: schema.places.category })
          .from(schema.places)
          .where(sql`${schema.places.category} <> ''`)
          .orderBy(asc(schema.places.category)),
        db
          .select({ v: schema.placeLists.name })
          .from(schema.placeLists)
          .orderBy(
            asc(schema.placeLists.position),
            asc(schema.placeLists.name),
          ),
        db.execute<{ v: string }>(
          sql`SELECT DISTINCT unnest(tags) AS v FROM places WHERE tags IS NOT NULL`,
        ),
        db.execute<{ v: string }>(
          sql`SELECT DISTINCT unnest(tags) AS v FROM posts WHERE tags IS NOT NULL`,
        ),
        db.execute<{ v: string }>(
          sql`SELECT DISTINCT unnest(tags) AS v FROM thoughts WHERE tags IS NOT NULL`,
        ),
      ]);

    const tags = new Set<string>();
    for (const r of placeTagRows as unknown as { v: string }[])
      if (r.v) tags.add(r.v);
    for (const r of postTagRows as unknown as { v: string }[])
      if (r.v) tags.add(r.v);
    for (const r of thoughtTagRows as unknown as { v: string }[])
      if (r.v) tags.add(r.v);

    return NextResponse.json({
      ok: true,
      categories: catRows.map((r) => r.v).filter(Boolean),
      lists: listRows.map((r) => r.v),
      tags: Array.from(tags).sort((a, b) => a.localeCompare(b)),
    });
  } catch (e) {
    const f = friendlyDbError(e, "rename");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const kind = body.kind as Kind;
  const from = String(body.from || "").trim();
  const to = String(body.to || "").trim();

  if (!kind || !["category", "list", "tag"].includes(kind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }
  if (!from) {
    return NextResponse.json({ error: "`from` is required" }, { status: 400 });
  }
  if (!to) {
    return NextResponse.json({ error: "`to` is required" }, { status: 400 });
  }
  if (from === to) {
    return NextResponse.json({ ok: true, affected: {}, total: 0 });
  }

  try {
    if (kind === "category") {
      const res = await db.execute<{ slug: string }>(
        sql`UPDATE places SET category = ${to}, updated_at = now() WHERE category = ${from} RETURNING slug`,
      );
      const n = (res as unknown as { slug: string }[]).length;
      revalidateCollection("places");
      return NextResponse.json({
        ok: true,
        affected: { places: n },
        total: n,
      });
    }

    if (kind === "list") {
      const result = await db.transaction(async (tx) => {
        const existing = await tx.execute<{ name: string }>(
          sql`SELECT name FROM place_lists WHERE name = ${to} LIMIT 1`,
        );
        const exists = (existing as unknown as { name: string }[]).length > 0;
        if (!exists) {
          await tx.execute(
            sql`UPDATE place_lists SET name = ${to}, updated_at = now() WHERE name = ${from}`,
          );
        } else {
          // Merge: drop the now-redundant source list row so it doesn't linger
          // as an empty taxonomy entry once its places are reassigned.
          await tx.execute(sql`DELETE FROM place_lists WHERE name = ${from}`);
        }
        const updated = await tx.execute<{ slug: string }>(
          sql`UPDATE places SET list = ${to}, updated_at = now() WHERE list = ${from} RETURNING slug`,
        );
        return {
          places: (updated as unknown as { slug: string }[]).length,
          merged: exists,
        };
      });
      revalidateCollection("places");
      revalidateCollection("placeLists");
      return NextResponse.json({
        ok: true,
        affected: { places: result.places, placeLists: result.merged ? 0 : 1 },
        merged: result.merged,
        total: result.places,
      });
    }

    // kind === "tag"
    const [placesRes, postsRes, thoughtsRes] = await Promise.all([
      db.execute<{ slug: string }>(
        sql`UPDATE places SET tags = array_replace(tags, ${from}, ${to}), updated_at = now() WHERE ${from} = ANY(tags) RETURNING slug`,
      ),
      db.execute<{ slug: string }>(
        sql`UPDATE posts SET tags = array_replace(tags, ${from}, ${to}), updated_at = now() WHERE ${from} = ANY(tags) RETURNING slug`,
      ),
      db.execute<{ id: number }>(
        sql`UPDATE thoughts SET tags = array_replace(tags, ${from}, ${to}), updated_at = now() WHERE ${from} = ANY(tags) RETURNING id`,
      ),
    ]);
    const placesN = (placesRes as unknown as unknown[]).length;
    const postsN = (postsRes as unknown as unknown[]).length;
    const thoughtsN = (thoughtsRes as unknown as unknown[]).length;
    const total = placesN + postsN + thoughtsN;
    if (placesN) revalidateCollection("places");
    if (postsN) revalidateCollection("posts");
    if (thoughtsN) revalidateCollection("thoughts");
    return NextResponse.json({
      ok: true,
      affected: { places: placesN, posts: postsN, thoughts: thoughtsN },
      total,
    });
  } catch (e) {
    const f = friendlyDbError(e, "rename");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
