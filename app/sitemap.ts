import type { MetadataRoute } from "next";
import { getPosts, getCustomProjects } from "@/lib/content";

// DB-backed (post/project slugs) → generated per request; CI can't reach the
// VPS pg at build time.
export const dynamic = "force-dynamic";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, projects] = await Promise.all([
    getPosts().catch(() => []),
    getCustomProjects().catch(() => []),
  ]);
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = STATIC.map(
    ({ path, priority }) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority,
    }),
  );

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/writing/${p.slug}`,
    lastModified: p.date ? new Date(p.date) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const projectRoutes: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${BASE}/projects/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes, ...projectRoutes];
}
