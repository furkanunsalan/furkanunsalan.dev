import { NextResponse } from "next/server";
import { and, inArray, isNotNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Collection =
  | "posts"
  | "projects"
  | "experiences"
  | "tools"
  | "places"
  | "thoughts";

const COLLECTIONS = new Set<Collection>([
  "posts",
  "projects",
  "experiences",
  "tools",
  "places",
  "thoughts",
]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const byCollection = new Map<Collection, string[]>();
  for (const it of body.items) {
    if (!it || typeof it !== "object") continue;
    const c = it.collection as Collection;
    const id = typeof it.id === "string" ? it.id : "";
    if (!COLLECTIONS.has(c) || !id) continue;
    const arr = byCollection.get(c) ?? [];
    arr.push(id);
    byCollection.set(c, arr);
  }

  if (byCollection.size === 0) {
    return NextResponse.json({ ok: true, purged: 0 });
  }

  const resourceOf: Record<Collection, string> = {
    posts: "post",
    projects: "project",
    experiences: "experience",
    tools: "tool",
    places: "place",
    thoughts: "thought",
  };

  try {
    let purged = 0;
    const purgedIds: { collection: Collection; id: string }[] = [];
    for (const [collection, ids] of byCollection) {
      let affected = 0;
      if (collection === "posts") {
        const rows = await db
          .delete(schema.posts)
          .where(
            and(
              inArray(schema.posts.slug, ids),
              isNotNull(schema.posts.deletedAt),
            ),
          )
          .returning({ slug: schema.posts.slug });
        affected = rows.length;
        for (const r of rows) purgedIds.push({ collection, id: r.slug });
      } else if (collection === "projects") {
        const rows = await db
          .delete(schema.projects)
          .where(
            and(
              inArray(schema.projects.slug, ids),
              isNotNull(schema.projects.deletedAt),
            ),
          )
          .returning({ slug: schema.projects.slug });
        affected = rows.length;
        for (const r of rows) purgedIds.push({ collection, id: r.slug });
      } else if (collection === "experiences") {
        const rows = await db
          .delete(schema.experiences)
          .where(
            and(
              inArray(schema.experiences.id, ids),
              isNotNull(schema.experiences.deletedAt),
            ),
          )
          .returning({ id: schema.experiences.id });
        affected = rows.length;
        for (const r of rows) purgedIds.push({ collection, id: r.id });
      } else if (collection === "tools") {
        const rows = await db
          .delete(schema.tools)
          .where(
            and(
              inArray(schema.tools.name, ids),
              isNotNull(schema.tools.deletedAt),
            ),
          )
          .returning({ name: schema.tools.name });
        affected = rows.length;
        for (const r of rows) purgedIds.push({ collection, id: r.name });
      } else if (collection === "places") {
        const rows = await db
          .delete(schema.places)
          .where(
            and(
              inArray(schema.places.slug, ids),
              isNotNull(schema.places.deletedAt),
            ),
          )
          .returning({ slug: schema.places.slug });
        affected = rows.length;
        for (const r of rows) purgedIds.push({ collection, id: r.slug });
      } else if (collection === "thoughts") {
        const numericIds = ids
          .map((s) => Number(s))
          .filter((n) => Number.isInteger(n) && n > 0);
        if (numericIds.length === 0) continue;
        const rows = await db
          .delete(schema.thoughts)
          .where(
            and(
              inArray(schema.thoughts.id, numericIds),
              isNotNull(schema.thoughts.deletedAt),
            ),
          )
          .returning({ id: schema.thoughts.id });
        affected = rows.length;
        for (const r of rows) purgedIds.push({ collection, id: String(r.id) });
      }
      purged += affected;
    }
    for (const r of purgedIds) {
      await recordAudit({
        req,
        action: "purge",
        resource: resourceOf[r.collection],
        rowId: r.id,
      });
    }
    return NextResponse.json({ ok: true, purged });
  } catch (e) {
    const f = friendlyDbError(e, "trash");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
