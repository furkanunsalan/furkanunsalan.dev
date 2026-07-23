import type { APIRoute } from "astro";
import { isNotNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

type Collection =
  "posts" | "projects" | "experiences" | "tools" | "places" | "thoughts";

type Item = {
  collection: Collection;
  id: string;
  label: string;
  deletedAt: string;
};

export const GET: APIRoute = async () => {
  try {
    const [posts, projects, experiences, tools, places, thoughts] =
      await Promise.all([
        db
          .select({
            slug: schema.posts.slug,
            title: schema.posts.title,
            deletedAt: schema.posts.deletedAt,
          })
          .from(schema.posts)
          .where(isNotNull(schema.posts.deletedAt)),
        db
          .select({
            slug: schema.projects.slug,
            name: schema.projects.name,
            deletedAt: schema.projects.deletedAt,
          })
          .from(schema.projects)
          .where(isNotNull(schema.projects.deletedAt)),
        db
          .select({
            id: schema.experiences.id,
            title: schema.experiences.title,
            organization: schema.experiences.organization,
            deletedAt: schema.experiences.deletedAt,
          })
          .from(schema.experiences)
          .where(isNotNull(schema.experiences.deletedAt)),
        db
          .select({
            name: schema.tools.name,
            brand: schema.tools.brand,
            deletedAt: schema.tools.deletedAt,
          })
          .from(schema.tools)
          .where(isNotNull(schema.tools.deletedAt)),
        db
          .select({
            slug: schema.places.slug,
            name: schema.places.name,
            deletedAt: schema.places.deletedAt,
          })
          .from(schema.places)
          .where(isNotNull(schema.places.deletedAt)),
        db
          .select({
            id: schema.thoughts.id,
            body: schema.thoughts.body,
            deletedAt: schema.thoughts.deletedAt,
          })
          .from(schema.thoughts)
          .where(isNotNull(schema.thoughts.deletedAt)),
      ]);

    const items: Item[] = [];
    for (const r of posts) {
      if (!r.deletedAt) continue;
      items.push({
        collection: "posts",
        id: r.slug,
        label: r.title || r.slug,
        deletedAt: r.deletedAt.toISOString(),
      });
    }
    for (const r of projects) {
      if (!r.deletedAt) continue;
      items.push({
        collection: "projects",
        id: r.slug,
        label: r.name || r.slug,
        deletedAt: r.deletedAt.toISOString(),
      });
    }
    for (const r of experiences) {
      if (!r.deletedAt) continue;
      const label = [r.title, r.organization].filter(Boolean).join(" @ ");
      items.push({
        collection: "experiences",
        id: r.id,
        label: label || r.id,
        deletedAt: r.deletedAt.toISOString(),
      });
    }
    for (const r of tools) {
      if (!r.deletedAt) continue;
      const label = [r.brand, r.name].filter(Boolean).join(" — ");
      items.push({
        collection: "tools",
        id: r.name,
        label: label || r.name,
        deletedAt: r.deletedAt.toISOString(),
      });
    }
    for (const r of places) {
      if (!r.deletedAt) continue;
      items.push({
        collection: "places",
        id: r.slug,
        label: r.name || r.slug,
        deletedAt: r.deletedAt.toISOString(),
      });
    }
    for (const r of thoughts) {
      if (!r.deletedAt) continue;
      const preview = (r.body || "").replace(/\s+/g, " ").trim().slice(0, 80);
      items.push({
        collection: "thoughts",
        id: String(r.id),
        label: preview || `Thought #${r.id}`,
        deletedAt: r.deletedAt.toISOString(),
      });
    }

    items.sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));
    return json({ ok: true, items });
  } catch (e) {
    const f = friendlyDbError(e, "trash");
    return json({ error: f.error }, f.status);
  }
};
