import type { APIRoute } from "astro";
import {
  getCustomProjects,
  getExperiences,
  getGithubProjectVisibility,
  getPlaces,
  getPosts,
  getThoughts,
  getTools,
} from "@/lib/content";
import { getGithubRepos } from "@/lib/github";

export const prerender = false;

type SearchItem = {
  kind:
    "post" | "project" | "repo" | "place" | "tool" | "experience" | "thought";
  title: string;
  snippet: string;
  href: string;
  date?: string;
};

function truncate(s: string, n = 140): string {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length <= n ? t : t.slice(0, n).trimEnd() + "…";
}

async function safe<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[search/index] ${label} failed:`, e);
    return fallback;
  }
}

export const GET: APIRoute = async () => {
  const [
    posts,
    customProjects,
    repos,
    visibility,
    places,
    tools,
    experiences,
    thoughts,
  ] = await Promise.all([
    safe("getPosts", () => getPosts(), []),
    safe("getCustomProjects", () => getCustomProjects(), []),
    safe("getGithubRepos", () => getGithubRepos(), []),
    safe("getGithubProjectVisibility", () => getGithubProjectVisibility(), {
      byName: new Map(),
    }),
    safe("getPlaces", () => getPlaces(), []),
    safe("getTools", () => getTools(), []),
    safe("getExperiences", () => getExperiences(), []),
    safe("getThoughts", () => getThoughts(), []),
  ]);

  const items: SearchItem[] = [];

  for (const p of posts) {
    items.push({
      kind: "post",
      title: p.title,
      snippet: truncate(p.excerpt || ""),
      href: `/writing/${p.slug}`,
      date: p.date,
    });
  }

  const customSlugs = new Set(customProjects.map((p) => p.slug.toLowerCase()));
  for (const p of customProjects) {
    items.push({
      kind: "project",
      title: p.name,
      snippet: truncate(p.description || ""),
      href: `/projects/${p.slug}`,
    });
  }

  for (const r of repos) {
    if (customSlugs.has(r.name.toLowerCase())) continue;
    const entry = visibility.byName.get(r.name.toLowerCase());
    if (entry && entry.visible === false) continue;
    items.push({
      kind: "repo",
      title: r.name,
      snippet: truncate(r.description || ""),
      href: r.html_url,
      date: r.pushed_at,
    });
  }

  for (const place of places) {
    const where = [place.city, place.country].filter(Boolean).join(" · ");
    items.push({
      kind: "place",
      title: place.name,
      snippet: truncate(where || place.address || ""),
      href: `/places#${place.slug}`,
      date: place.addedAt,
    });
  }

  for (const t of tools) {
    const title = [t.brand, t.what].filter(Boolean).join(" ").trim() || t.name;
    items.push({
      kind: "tool",
      title,
      snippet: truncate(t.comment || ""),
      href: "/gadgets",
    });
  }

  for (const ex of experiences) {
    const title = [ex.title, ex.organization].filter(Boolean).join(" · ");
    items.push({
      kind: "experience",
      title,
      snippet: truncate(ex.comment || ""),
      href: "/experience",
    });
  }

  for (const th of thoughts) {
    items.push({
      kind: "thought",
      title: truncate((th.body || "").split("\n")[0] || "Thought", 80),
      snippet: truncate((th.body || "").slice(0, 200), 140),
      href: `/writing#t-${th.id}`,
      date: th.createdAt,
    });
  }

  return new Response(JSON.stringify({ ok: true, items }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60",
    },
  });
};
