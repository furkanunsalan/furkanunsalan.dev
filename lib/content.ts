import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../keystatic.config";
import type { Experience, Tool } from "@/types";
import type { BlogPost } from "@/types";

export const reader = createReader(process.cwd(), keystaticConfig);

export async function getPosts(): Promise<BlogPost[]> {
  const slugs = await reader.collections.posts.list();
  const entries = await Promise.all(
    slugs.map(async (slug) => {
      const entry = await reader.collections.posts.read(slug);
      if (!entry) return null;
      return {
        slug,
        title: entry.title,
        date: String(entry.date),
        tags: [...entry.tags],
      };
    }),
  );
  return entries.filter((e): e is BlogPost => e !== null);
}

export async function getPostBySlug(slug: string) {
  const entry = await reader.collections.posts.read(slug);
  if (!entry) return null;
  const { node } = await entry.content();
  return {
    slug,
    title: entry.title,
    date: String(entry.date),
    tags: [...entry.tags],
    node,
  };
}

export async function getExperiences(): Promise<Experience[]> {
  const slugs = await reader.collections.experiences.list();
  const entries = await Promise.all(
    slugs.map((s) => reader.collections.experiences.read(s)),
  );

  const out = entries
    .map((entry, i): Experience | null => {
      if (!entry) return null;
      const formatDate = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("en-GB") : "";
      return {
        id: i + 1,
        order: entry.order ?? 100,
        organization: entry.organization,
        title: entry.title,
        start_date: formatDate(entry.startDate as unknown as string),
        end_date: entry.endDate
          ? formatDate(entry.endDate as unknown as string)
          : undefined,
        comment: entry.comment,
        links: entry.links
          .filter((l): l is { label: string; url: string } => !!l.url)
          .map((l) => ({ label: l.label, url: l.url })),
        images: entry.images
          .filter((p): p is string => typeof p === "string" && p.length > 0)
          .map((p) => (p.startsWith("/") ? p : `/experiences/${p}`)),
      };
    })
    .filter((e): e is Experience => e !== null);

  // Most recent first by start_date (DD/MM/YYYY)
  const parse = (s: string) => {
    const [d, m, y] = s.split("/").map(Number);
    return new Date(y || 0, (m || 1) - 1, d || 1).getTime();
  };
  out.sort((a, b) => parse(b.start_date) - parse(a.start_date));
  return out;
}

export async function getTools(): Promise<Tool[]> {
  const slugs = await reader.collections.tools.list();
  const entries = await Promise.all(
    slugs.map((s) => reader.collections.tools.read(s)),
  );

  return entries
    .map((entry, i): Tool | null => {
      if (!entry) return null;
      return {
        id: i + 1,
        name: entry.name,
        brand: entry.brand,
        what: entry.what,
        category: entry.category,
        comment: entry.comment,
        favorite: entry.favorite,
        link: entry.link ?? undefined,
      };
    })
    .filter((t): t is Tool => t !== null);
}
