import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { ICON_KEYS } from "@/lib/place-list-icons";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const ICON_SET = new Set<string>(ICON_KEYS);

export const PATCH: APIRoute = async ({ request, params }) => {
  const name = params.name ?? "";
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad json" }, 400);
  }
  const patch: Partial<typeof schema.placeLists.$inferInsert> & {
    updatedAt?: Date;
  } = { updatedAt: new Date() };
  if (typeof body.icon === "string" && ICON_SET.has(body.icon))
    patch.icon = body.icon;
  if (typeof body.position === "number") patch.position = body.position;
  try {
    const [before] = await db
      .select()
      .from(schema.placeLists)
      .where(eq(schema.placeLists.name, name))
      .limit(1);
    const [row] = await db
      .update(schema.placeLists)
      .set(patch)
      .where(eq(schema.placeLists.name, name))
      .returning();
    if (!row) return json({ error: "not found" }, 404);
    revalidateCollection("placeLists");
    await recordAudit({
      req: request,
      action: "update",
      resource: "placeList",
      rowId: name,
      before: before as unknown as Record<string, unknown> | null,
      after: row as unknown as Record<string, unknown>,
    });
    return json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "list");
    return json({ error: f.error }, f.status);
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const name = params.name ?? "";
  try {
    const [before] = await db
      .select()
      .from(schema.placeLists)
      .where(eq(schema.placeLists.name, name))
      .limit(1);
    // Detach members first — places.list is a loose string, no FK to enforce.
    await db
      .update(schema.places)
      .set({ list: "", updatedAt: new Date() })
      .where(eq(schema.places.list, name));
    const [row] = await db
      .delete(schema.placeLists)
      .where(eq(schema.placeLists.name, name))
      .returning();
    if (!row) return json({ error: "not found" }, 404);
    revalidateCollection("placeLists");
    await recordAudit({
      req: request,
      action: "delete",
      resource: "placeList",
      rowId: name,
      before: before as unknown as Record<string, unknown> | null,
    });
    return json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "list");
    return json({ error: f.error }, f.status);
  }
};
