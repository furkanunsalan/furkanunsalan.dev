import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";

export const runtime = "nodejs";

export async function GET() {
  const rows = await db
    .select()
    .from(schema.githubProjectVisibility)
    .orderBy(
      asc(schema.githubProjectVisibility.pinOrder),
      asc(schema.githubProjectVisibility.name),
    );
  return NextResponse.json({ rows });
}

// PATCH replaces the toggle state for every row in one shot. Body is the
// full ordered list — the row at index N gets pin_order = N if pinned.
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json(
      { error: "expected { rows: [...] }" },
      { status: 400 },
    );
  }
  try {
    // Wrap the per-row upserts in a transaction so a partial failure
    // (network blip on row 50 of 100) doesn't leave the visibility table
    // half-updated with stale pin_order.
    await db.transaction(async (tx) => {
      let pinIdx = 0;
      for (const r of body.rows) {
        if (!r || typeof r.name !== "string") continue;
        const pinned = !!r.pinned;
        await tx
          .insert(schema.githubProjectVisibility)
          .values({
            name: r.name,
            visible: r.visible !== false,
            pinned,
            pinOrder: pinned ? pinIdx++ : 0,
          })
          .onConflictDoUpdate({
            target: schema.githubProjectVisibility.name,
            set: {
              visible: r.visible !== false,
              pinned,
              pinOrder: pinned ? pinIdx - 1 : 0,
              updatedAt: new Date(),
            },
          });
      }
    });
    revalidateCollection("github");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "repo visibility");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
