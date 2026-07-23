import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { resolvePlaceUrl } from "@/lib/place-resolve";
import { db, schema } from "@/lib/db";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad json" }, 400);
  }
  const result = await resolvePlaceUrl(body.url || "");
  if (!result.ok) {
    return json({ error: result.error }, result.status);
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
  return json({ ...payload, existing: existing || null });
};
