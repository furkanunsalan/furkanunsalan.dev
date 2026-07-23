import type { APIRoute } from "astro";
import { asc } from "drizzle-orm";
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

export const GET: APIRoute = async () => {
  const rows = await db
    .select()
    .from(schema.placeLists)
    .orderBy(asc(schema.placeLists.position), asc(schema.placeLists.name));
  return json({ rows });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad json" }, 400);
  }
  const name = String(body.name || "").trim();
  if (!name) return json({ error: "name required" }, 400);
  const icon = ICON_SET.has(body.icon) ? String(body.icon) : "map-pin";
  const position = typeof body.position === "number" ? body.position : 100;
  try {
    const [row] = await db
      .insert(schema.placeLists)
      .values({ name, icon, position })
      .returning();
    revalidateCollection("placeLists");
    await recordAudit({
      req: request,
      action: "create",
      resource: "placeList",
      rowId: name,
      after: row as unknown as Record<string, unknown>,
    });
    return json({ row }, 201);
  } catch (e) {
    const f = friendlyDbError(e, "list");
    return json({ error: f.error }, f.status);
  }
};
