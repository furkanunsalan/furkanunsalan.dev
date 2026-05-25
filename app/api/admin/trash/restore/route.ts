import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
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
    return NextResponse.json({ ok: true, restored: 0 });
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
    let restored = 0;
    const now = new Date();
    const touched: Collection[] = [];
    const restoredIds: { collection: Collection; id: string }[] = [];

    for (const [collection, ids] of byCollection) {
      let affected = 0;
      if (collection === "posts") {
        const rows = await db
          .update(schema.posts)
          .set({ deletedAt: null, updatedAt: now })
          .where(inArray(schema.posts.slug, ids))
          .returning({ slug: schema.posts.slug });
        affected = rows.length;
        for (const r of rows) restoredIds.push({ collection, id: r.slug });
      } else if (collection === "projects") {
        const rows = await db
          .update(schema.projects)
          .set({ deletedAt: null, updatedAt: now })
          .where(inArray(schema.projects.slug, ids))
          .returning({ slug: schema.projects.slug });
        affected = rows.length;
        for (const r of rows) restoredIds.push({ collection, id: r.slug });
      } else if (collection === "experiences") {
        const rows = await db
          .update(schema.experiences)
          .set({ deletedAt: null, updatedAt: now })
          .where(inArray(schema.experiences.id, ids))
          .returning({ id: schema.experiences.id });
        affected = rows.length;
        for (const r of rows) restoredIds.push({ collection, id: r.id });
      } else if (collection === "tools") {
        const rows = await db
          .update(schema.tools)
          .set({ deletedAt: null, updatedAt: now })
          .where(inArray(schema.tools.name, ids))
          .returning({ name: schema.tools.name });
        affected = rows.length;
        for (const r of rows) restoredIds.push({ collection, id: r.name });
      } else if (collection === "places") {
        const rows = await db
          .update(schema.places)
          .set({ deletedAt: null, updatedAt: now })
          .where(inArray(schema.places.slug, ids))
          .returning({ slug: schema.places.slug });
        affected = rows.length;
        for (const r of rows) restoredIds.push({ collection, id: r.slug });
      } else if (collection === "thoughts") {
        const numericIds = ids
          .map((s) => Number(s))
          .filter((n) => Number.isInteger(n) && n > 0);
        if (numericIds.length === 0) continue;
        const rows = await db
          .update(schema.thoughts)
          .set({ deletedAt: null, updatedAt: now })
          .where(inArray(schema.thoughts.id, numericIds))
          .returning({ id: schema.thoughts.id });
        affected = rows.length;
        for (const r of rows)
          restoredIds.push({ collection, id: String(r.id) });
      }
      if (affected > 0) touched.push(collection);
      restored += affected;
    }

    for (const c of touched) revalidateCollection(c);
    for (const r of restoredIds) {
      await recordAudit({
        req,
        action: "restore",
        resource: resourceOf[r.collection],
        rowId: r.id,
        after: { deletedAt: null },
      });
    }
    return NextResponse.json({ ok: true, restored });
  } catch (e) {
    const f = friendlyDbError(e, "trash");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}
