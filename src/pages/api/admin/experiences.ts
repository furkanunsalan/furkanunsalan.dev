import type { APIRoute } from "astro";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { slugifyAscii, cleanUserSlug } from "@/lib/slugify";
import { revalidateCollection } from "@/lib/revalidate";
import { cleanLinks, cleanStringArray } from "@/lib/validators";
import { recordAudit } from "@/lib/audit";

export const prerender = false;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const GET: APIRoute = async () => {
  const rows = await db
    .select()
    .from(schema.experiences)
    .orderBy(asc(schema.experiences.order));
  return json({ rows }, 200);
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad json" }, 400);
  }
  const title = (body.title || "").trim();
  const organization = (body.organization || "").trim();
  if (!title || !organization) {
    return json({ error: "title and organization required" }, 400);
  }
  const id =
    cleanUserSlug(body.id) ||
    slugifyAscii(`${organization}-${title}`, "experience");
  const startDate = body.startDate || new Date().toISOString().slice(0, 10);

  try {
    const [row] = await db
      .insert(schema.experiences)
      .values({
        id,
        order: typeof body.order === "number" ? body.order : 100,
        organization,
        title,
        startDate,
        endDate: body.endDate || null,
        comment: body.comment ?? "",
        logo: typeof body.logo === "string" ? body.logo.trim() || null : null,
        links: cleanLinks(body.links),
        images: cleanStringArray(body.images),
      })
      .returning();
    revalidateCollection("experiences");
    await recordAudit({
      req: request,
      action: "create",
      resource: "experience",
      rowId: id,
      after: row as unknown as Record<string, unknown>,
    });
    return json({ row }, 201);
  } catch (e) {
    const f = friendlyDbError(e, "experience");
    return json({ error: f.error }, f.status);
  }
};
