import type { APIRoute } from "astro";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { slugifyAscii, cleanUserSlug } from "@/lib/slugify";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";
import { readJson } from "@/lib/validate";

export const prerender = false;

// Validated input schema for a gadget/tool. The category enum is derived from
// db/schema.ts so the two never drift. This is the reference pattern for
// zod-at-the-boundary; other admin routes can adopt the same shape.
const ToolCreate = z.object({
  brand: z.string().trim().default(""),
  what: z.string().trim().min(1, "required"),
  name: z.string().trim().optional(),
  category: z.enum(schema.toolCategoryEnum.enumValues).default("tech"),
  order: z.number().int().default(100),
  comment: z.string().default(""),
  favorite: z.boolean().default(false),
  link: z.string().trim().nullish(),
  icon: z.string().trim().nullish(),
});

export const GET: APIRoute = async () => {
  const rows = await db
    .select()
    .from(schema.tools)
    .orderBy(asc(schema.tools.name));
  return new Response(JSON.stringify({ rows }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const parsed = await readJson(request, ToolCreate);
  if ("response" in parsed) return parsed.response;
  const b = parsed.data;
  const name =
    cleanUserSlug(b.name) || slugifyAscii(`${b.brand}-${b.what}`, "tool");

  try {
    const [row] = await db
      .insert(schema.tools)
      .values({
        name,
        brand: b.brand,
        what: b.what,
        category: b.category,
        order: b.order,
        comment: b.comment,
        favorite: b.favorite,
        link: b.link || null,
        icon: b.icon?.trim() || null,
      })
      .returning();
    revalidateCollection("tools");
    await recordAudit({
      req: request,
      action: "create",
      resource: "tool",
      rowId: name,
      after: row as unknown as Record<string, unknown>,
    });
    return new Response(JSON.stringify({ row }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    const f = friendlyDbError(e, "tool");
    return new Response(JSON.stringify({ error: f.error }), {
      status: f.status,
      headers: { "content-type": "application/json" },
    });
  }
};
