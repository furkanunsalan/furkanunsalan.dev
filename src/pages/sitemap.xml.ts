import type { APIRoute } from "astro";
import { getPosts, getCustomProjects } from "@/lib/content";

export const prerender = false;

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://furkanunsalan.dev";

const STATIC: { path: string; priority: number }[] = [
  { path: "", priority: 1 },
  { path: "/writing", priority: 0.8 },
  { path: "/projects", priority: 0.8 },
  { path: "/experience", priority: 0.7 },
  { path: "/gadgets", priority: 0.6 },
  { path: "/photos", priority: 0.6 },
  { path: "/places", priority: 0.6 },
  { path: "/bookmarks", priority: 0.5 },
  { path: "/resume", priority: 0.5 },
];

type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: string;
  priority: number;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderUrl(entry: SitemapEntry): string {
  return `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${entry.lastModified.toISOString()}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
}

export const GET: APIRoute = async () => {
  const [posts, projects] = await Promise.all([
    getPosts().catch(() => []),
    getCustomProjects().catch(() => []),
  ]);
  const now = new Date();

  const staticRoutes: SitemapEntry[] = STATIC.map(({ path, priority }) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority,
  }));

  const postRoutes: SitemapEntry[] = posts.map((p) => ({
    url: `${BASE}/writing/${p.slug}`,
    lastModified: p.date ? new Date(p.date) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const projectRoutes: SitemapEntry[] = projects.map((p) => ({
    url: `${BASE}/projects/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const entries = [...staticRoutes, ...postRoutes, ...projectRoutes];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(renderUrl).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "content-type": "application/xml" },
  });
};
