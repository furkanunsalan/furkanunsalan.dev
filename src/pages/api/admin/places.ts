import type { APIRoute } from "astro";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { slugifyAscii, cleanUserSlug } from "@/lib/slugify";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const STATUSES = new Set<string>(schema.placeStatusEnum.enumValues);

export const GET: APIRoute = async () => {
  const rows = await db
    .select()
    .from(schema.places)
    .orderBy(desc(schema.places.addedAt));
  return json({ rows });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad json" }, 400);
  }
  const name = (body.name || "").trim();
  if (!name) return json({ error: "name required" }, 400);
  if (typeof body.lat !== "number" || typeof body.lng !== "number") {
    return json({ error: "lat/lng required" }, 400);
  }
  const slug = cleanUserSlug(body.slug) || slugifyAscii(name, "place");
  const status = STATUSES.has(body.status) ? body.status : "want-to-go";
  const tags = Array.isArray(body.tags)
    ? body.tags
        .filter((t: unknown) => typeof t === "string" && t.length > 0)
        .slice(0, 3)
    : [];
  const addedAt = body.addedAt ? new Date(body.addedAt) : new Date();

  try {
    const [row] = await db
      .insert(schema.places)
      .values({
        slug,
        name,
        lat: body.lat,
        lng: body.lng,
        address: body.address ?? "",
        list: body.list ?? "",
        category: body.category ?? "",
        country: body.country ?? "",
        city: body.city ?? "",
        status,
        sourceUrl: body.sourceUrl || null,
        addedAt,
        tags,
        notes: body.notes ?? "",
      })
      .returning();
    revalidateCollection("places");
    await recordAudit({
      req: request,
      action: "create",
      resource: "place",
      rowId: slug,
      after: row as unknown as Record<string, unknown>,
    });
    return json({ row }, 201);
  } catch (e) {
    const f = friendlyDbError(e, "place");
    return json({ error: f.error }, f.status);
  }
};
