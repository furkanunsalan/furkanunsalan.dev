import type { APIRoute } from "astro";
import {
  getCustomProjects,
  getGithubProjectVisibility,
  getPosts,
  getThoughts,
} from "@/lib/content";
import { getGithubRepos } from "@/lib/github";
import {
  parseQuery,
  search,
  ALL_KINDS,
  type HitKind,
  type SearchHit,
  type SearchKind,
} from "@/lib/search";
import { excerptFromMarkdoc } from "@/lib/excerpt";

export const prerender = false;

const KIND_SET = new Set<string>(ALL_KINDS);

function parseKinds(raw: string | null): HitKind[] | undefined {
  if (!raw) return undefined;
  const kinds = raw
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter((k): k is HitKind => KIND_SET.has(k));
  return kinds.length > 0 ? kinds : undefined;
}

// Repos live behind the GitHub API, not Postgres, so they can't ride the
// tsvector union. Scored on the same 0..1 scale as ts_rank_cd so the two sets
// interleave sensibly instead of one always winning.
async function repoHits(q: string, limit: number): Promise<SearchHit[]> {
  const terms = parseQuery(q).terms.map((t) => t.toLowerCase());
  if (terms.length === 0) return [];

  // GitHub is a network dependency: a missing token or an API blip must not
  // take the Postgres-backed results down with it.
  let repos: Awaited<ReturnType<typeof getGithubRepos>>;
  let customProjects: Awaited<ReturnType<typeof getCustomProjects>>;
  let visibility: Awaited<ReturnType<typeof getGithubProjectVisibility>>;
  try {
    [repos, customProjects, visibility] = await Promise.all([
      getGithubRepos(),
      getCustomProjects(),
      getGithubProjectVisibility(),
    ]);
  } catch (e) {
    console.error("[api/search] repo lookup failed:", e);
    return [];
  }

  const customSlugs = new Set(customProjects.map((p) => p.slug.toLowerCase()));

  const scored = repos.flatMap((r) => {
    const name = r.name.toLowerCase();
    if (customSlugs.has(name)) return [];
    if (visibility.byName.get(name)?.visible === false) return [];

    const description = (r.description || "").toLowerCase();
    let best = 0;
    for (const term of terms) {
      if (name === term) best = Math.max(best, 1);
      else if (name.startsWith(term)) best = Math.max(best, 0.7);
      else if (name.includes(term)) best = Math.max(best, 0.5);
      else if (description.includes(term)) best = Math.max(best, 0.3);
    }
    if (best === 0) return [];

    const hit: SearchHit = {
      kind: "repo",
      title: r.name,
      subtitle: "github",
      snippet: r.description || "",
      href: r.html_url,
      date: r.pushed_at,
      score: best * 0.9,
    };
    return [hit];
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Empty-state rows for the palette: the newest writing, no query involved.
async function recentHits(limit: number): Promise<SearchHit[]> {
  const [posts, thoughts] = await Promise.all([getPosts(), getThoughts()]);

  const hits: SearchHit[] = [
    ...posts.map((p) => ({
      kind: "post" as const,
      title: p.title,
      subtitle: (p.tags || []).join(" · "),
      snippet: p.excerpt || "",
      href: `/writing/${p.slug}`,
      date: p.date,
      score: 0,
    })),
    ...thoughts.map((t) => ({
      kind: "thought" as const,
      title: excerptFromMarkdoc(t.body, 12) || "Thought",
      subtitle: (t.tags || []).join(" · "),
      snippet: excerptFromMarkdoc(t.body, 28),
      href: `/writing#t-${t.id}`,
      date: t.createdAt,
      score: 0,
    })),
  ];

  return hits
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, limit);
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").slice(0, 200);
  const kinds = parseKinds(url.searchParams.get("kinds"));

  const limitRaw = Number(url.searchParams.get("limit") || "10");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 50)
    : 10;

  try {
    let items: SearchHit[];
    if (!q.trim()) {
      items = await recentHits(limit);
    } else {
      const wantRepos = !kinds || kinds.includes("repo");
      const dbKinds = kinds?.filter((k): k is SearchKind => k !== "repo");
      const [dbItems, repos] = await Promise.all([
        dbKinds && dbKinds.length === 0
          ? Promise.resolve([])
          : search(q, { limit, kinds: dbKinds }),
        wantRepos ? repoHits(q, limit) : Promise.resolve([]),
      ]);
      items = [...dbItems, ...repos]
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }

    return new Response(JSON.stringify({ ok: true, q, items }), {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=30",
      },
    });
  } catch (e) {
    console.error("[api/search] failed:", e);
    return new Response(JSON.stringify({ ok: false, q, items: [] }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }
};
