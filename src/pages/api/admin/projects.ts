import type { APIRoute } from "astro";
import { asc } from "drizzle-orm";
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

export const GET: APIRoute = async () => {
  const rows = await db
    .select()
    .from(schema.projects)
    .orderBy(asc(schema.projects.order));
  return json({ rows });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad json" }, 400);
  }
  const name = (body.name || "").trim();
  if (!name) return json({ error: "name required" }, 400);
  const slug = cleanUserSlug(body.slug) || slugifyAscii(name, "project");

  try {
    const [row] = await db
      .insert(schema.projects)
      .values({
        slug,
        name,
        description: body.description ?? "",
        metric: body.metric ?? "",
        link: body.link ?? "",
        language: body.language || null,
        order: typeof body.order === "number" ? body.order : 100,
        image: body.image || null,
        content: body.content ?? "",
      })
      .returning();
    revalidateCollection("projects", slug);
    await recordAudit({
      req: request,
      action: "create",
      resource: "project",
      rowId: slug,
      after: row as unknown as Record<string, unknown>,
    });
    return json({ row }, 201);
  } catch (e) {
    const f = friendlyDbError(e, "project");
    return json({ error: f.error }, f.status);
  }
};
