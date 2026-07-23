import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { excerptFromMarkdoc } from "@/lib/excerpt";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug!;
  const [row] = await db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.slug, slug))
    .limit(1);
  if (!row) return json({ error: "not found" }, 404);
  return json({ row });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  const slug = params.slug!;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad json" }, 400);
  }
  const patch: Partial<typeof schema.posts.$inferInsert> & {
    updatedAt?: Date;
  } = {
    updatedAt: new Date(),
  };
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.date === "string") patch.date = body.date;
  if (Array.isArray(body.tags))
    patch.tags = body.tags.filter(
      (t: unknown) => typeof t === "string" && t.length > 0,
    );
  if (typeof body.banner === "string") patch.banner = body.banner || null;
  if (body.banner === null) patch.banner = null;
  if (typeof body.content === "string") {
    patch.content = body.content;
    patch.excerpt = excerptFromMarkdoc(body.content);
  }
  if (typeof body.draft === "boolean") patch.draft = body.draft;

  try {
    const [before] = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.slug, slug))
      .limit(1);
    const [row] = await db
      .update(schema.posts)
      .set(patch)
      .where(eq(schema.posts.slug, slug))
      .returning();
    if (!row) return json({ error: "not found" }, 404);
    revalidateCollection("posts", slug);
    await recordAudit({
      req: request,
      action: "update",
      resource: "post",
      rowId: slug,
      before: before as unknown as Record<string, unknown> | null,
      after: row as unknown as Record<string, unknown>,
    });
    return json({ row });
  } catch (e) {
    const f = friendlyDbError(e, "post");
    return json({ error: f.error }, f.status);
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const slug = params.slug!;
  try {
    const [before] = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.slug, slug))
      .limit(1);
    const [row] = await db
      .update(schema.posts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.posts.slug, slug))
      .returning();
    if (!row) return json({ error: "not found" }, 404);
    revalidateCollection("posts", slug);
    await recordAudit({
      req: request,
      action: "delete",
      resource: "post",
      rowId: slug,
      before: before as unknown as Record<string, unknown> | null,
      after: { deletedAt: row.deletedAt },
    });
    return json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "post");
    return json({ error: f.error }, f.status);
  }
};
