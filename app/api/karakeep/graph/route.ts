import { BOOKMARK_LISTS, getKarakeepBookmarks } from "@/lib/karakeep";
import type { KarakeepBookmark } from "@/lib/karakeep";

export const runtime = "nodejs";
export const revalidate = 3600;

// Assembles an Obsidian-style graph from Karakeep: tag nodes (hubs) + bookmark
// nodes (leaves), linked bookmark→tag. Only tagged bookmarks are included so
// every node is connected.
export async function GET(req: Request) {
  try {
    // Karakeep auto-tags very granularly, so most tags appear once. Graphing all
    // of them is a hairball; keep only tags shared by >= MIN_TAG bookmarks (the
    // topics that actually connect things), then only bookmarks under those.
    const MIN_TAG = Math.max(
      2,
      Number(new URL(req.url).searchParams.get("min")) || 4,
    );
    const all: (KarakeepBookmark & { list: string })[] = [];
    const seen = new Set<string>();
    const CAP = 600;

    for (const list of BOOKMARK_LISTS) {
      let cursor: string | null = null;
      do {
        const { items, nextCursor } = await getKarakeepBookmarks(
          list.id,
          cursor,
          100,
        );
        for (const b of items) {
          if (!seen.has(b.id)) {
            seen.add(b.id);
            all.push({ ...b, list: list.title });
          }
        }
        cursor = nextCursor;
      } while (cursor && all.length < CAP);
    }

    const rawCount = new Map<string, number>();
    for (const b of all)
      for (const t of b.tags) rawCount.set(t, (rawCount.get(t) ?? 0) + 1);

    // keep only meaningful (shared) tags, then bookmarks that carry at least one
    const keepTag = new Set(
      [...rawCount].filter(([, c]) => c >= MIN_TAG).map(([t]) => t),
    );
    const tagged = all
      .map((b) => ({ ...b, tags: b.tags.filter((t) => keepTag.has(t)) }))
      .filter((b) => b.tags.length > 0);
    const tagCount = new Map<string, number>();
    for (const b of tagged) {
      for (const t of b.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    }

    const nodes: Array<{
      id: string;
      kind: "tag" | "bookmark";
      label: string;
      weight?: number;
      url?: string;
      list?: string;
      excerpt?: string;
      cover?: string | null;
      created?: string;
      tags?: string[];
    }> = [];
    for (const [tag, count] of tagCount) {
      nodes.push({ id: `t:${tag}`, kind: "tag", label: tag, weight: count });
    }
    const links: Array<{ s: string; t: string }> = [];
    for (const b of tagged) {
      nodes.push({
        id: `b:${b.id}`,
        kind: "bookmark",
        label: b.title,
        url: b.link,
        list: b.list,
        excerpt: b.excerpt,
        cover: b.cover,
        created: b.created,
        tags: b.tags,
      });
      for (const t of b.tags) links.push({ s: `b:${b.id}`, t: `t:${t}` });
    }

    return new Response(
      JSON.stringify({
        nodes,
        links,
        stats: { bookmarks: tagged.length, tags: tagCount.size },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("[karakeep/graph]", error);
    return new Response(JSON.stringify({ error: "Failed to build graph" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
