import type { APIRoute } from "astro";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { slugifyAscii, cleanUserSlug } from "@/lib/slugify";
import { excerptFromMarkdoc } from "@/lib/excerpt";
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
    .from(schema.posts)
    .orderBy(desc(schema.posts.date));
  return json({ rows });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad json" }, 400);
  }
  const title = (body.title || "").trim();
  if (!title) return json({ error: "title required" }, 400);
  const date = body.date || new Date().toISOString().slice(0, 10);
  const slug = cleanUserSlug(body.slug) || slugifyAscii(title, "post");
  const content = body.content ?? "";
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t: unknown) => typeof t === "string" && t.length > 0)
    : [];

  try {
    const [row] = await db
      .insert(schema.posts)
      .values({
        slug,
        title,
        date,
        tags,
        banner: body.banner || null,
        content,
        excerpt: excerptFromMarkdoc(content),
        draft: !!body.draft,
      })
      .returning();
    revalidateCollection("posts", slug);
    await recordAudit({
      req: request,
      action: "create",
      resource: "post",
      rowId: slug,
      after: row as unknown as Record<string, unknown>,
    });
    return json({ row }, 201);
  } catch (e) {
    const f = friendlyDbError(e, "post");
    return json({ error: f.error }, f.status);
  }
};
