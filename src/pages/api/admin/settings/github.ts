import type { APIRoute } from "astro";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const GET: APIRoute = async () => {
  const rows = await db
    .select()
    .from(schema.githubProjectVisibility)
    .orderBy(
      asc(schema.githubProjectVisibility.pinOrder),
      asc(schema.githubProjectVisibility.name),
    );
  return json({ rows });
};

// PATCH replaces the toggle state for every row in one shot. Body is the
// full ordered list — the row at index N gets pin_order = N if pinned.
export const PATCH: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) {
    return json({ error: "expected { rows: [...] }" }, 400);
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
    await recordAudit({
      req: request,
      action: "update",
      resource: "github",
      rowId: "visibility",
      after: { rows: body.rows.length },
    });
    return json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "repo visibility");
    return json({ error: f.error }, f.status);
  }
};
