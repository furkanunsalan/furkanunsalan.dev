import { createReader } from "@keystatic/core/reader";
import fs from "node:fs/promises";
import path from "node:path";
import keystaticConfig from "../keystatic.config";
import type { CustomProject, Experience, Tool } from "@/types";
import type { BlogPost } from "@/types";

export const reader = createReader(process.cwd(), keystaticConfig);

// Plain-text excerpt for cards/teasers — reads the raw .mdoc, drops the YAML
// frontmatter, strips Markdoc markup, and clips to ~30 words. Cheap because we
// only ever do this on the server during a list render.
async function readExcerpt(slug: string, maxWords = 32): Promise<string> {
  try {
    const file = path.join(
      process.cwd(),
      "content",
      "posts",
      slug,
      "index.mdoc",
    );
    const raw = await fs.readFile(file, "utf8");
    const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, "");
    const text = body
      .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
      .replace(/`[^`]*`/g, " ") // inline code
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ") // images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → just the label
      .replace(/<[^>]+>/g, " ") // stray HTML/JSX-ish tags
      .replace(/[#>*_~`-]+/g, " ") // markdown decoration
      .replace(/\s+/g, " ")
      .trim();
    const words = text.split(" ").filter(Boolean);
    if (words.length <= maxWords) return words.join(" ");
    return words.slice(0, maxWords).join(" ") + "…";
  } catch {
    return "";
  }
}

function resolveBanner(slug: string, value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  if (value.startsWith("/")) return value;
  // Keystatic image fields configured with publicPath: "/posts/" return only
  // the filename; prepend the public path so <Image> can load it.
  return `/posts/${value}`;
}

export async function getPosts(): Promise<BlogPost[]> {
  const slugs = await reader.collections.posts.list();
  const entries = await Promise.all(
    slugs.map(async (slug) => {
      const entry = await reader.collections.posts.read(slug);
      if (!entry) return null;
      const post: BlogPost = {
        slug,
        title: entry.title,
        date: String(entry.date),
        tags: [...entry.tags],
      };
      const banner = resolveBanner(
        slug,
        (entry as { banner?: unknown }).banner,
      );
      if (banner) post.banner = banner;
      const excerpt = await readExcerpt(slug);
      if (excerpt) post.excerpt = excerpt;
      return post;
    }),
  );
  return entries.filter((e): e is BlogPost => e !== null);
}

export async function getPostBySlug(slug: string) {
  const entry = await reader.collections.posts.read(slug);
  if (!entry) return null;
  const { node } = await entry.content();
  const banner = resolveBanner(slug, (entry as { banner?: unknown }).banner);
  return {
    slug,
    title: entry.title,
    date: String(entry.date),
    tags: [...entry.tags],
    banner,
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

export async function getCustomProjects(): Promise<CustomProject[]> {
  const slugs = await reader.collections.projects.list();
  const entries = await Promise.all(
    slugs.map(async (slug): Promise<CustomProject | null> => {
      const entry = await reader.collections.projects.read(slug);
      if (!entry) return null;
      const image =
        typeof entry.image === "string" && entry.image.length > 0
          ? entry.image.startsWith("/")
            ? entry.image
            : `/projects/${entry.image}`
          : undefined;
      const project: CustomProject = {
        slug,
        name: entry.name,
        description: entry.description,
        metric: entry.metric,
        link: entry.link ?? "",
        order: entry.order ?? 100,
        ...(entry.language ? { language: entry.language } : {}),
        ...(image ? { image } : {}),
      };
      return project;
    }),
  );
  return entries
    .filter((p): p is CustomProject => p !== null)
    .sort((a, b) => a.order - b.order);
}

export async function getCustomProjectBySlug(slug: string) {
  const entry = await reader.collections.projects.read(slug);
  if (!entry) return null;
  const { node } = await entry.content();
  const image =
    typeof entry.image === "string" && entry.image.length > 0
      ? entry.image.startsWith("/")
        ? entry.image
        : `/projects/${entry.image}`
      : undefined;
  return {
    slug,
    name: entry.name,
    description: entry.description,
    metric: entry.metric,
    link: entry.link ?? "",
    language: entry.language || undefined,
    order: entry.order ?? 100,
    image,
    node,
  };
}

export type HomeSocialIcon =
  | "github"
  | "linkedin"
  | "mail"
  | "cv"
  | "medium"
  | "rss"
  | "x"
  | "youtube"
  | "instagram"
  | "mastodon"
  | "bluesky"
  | "globe";

export type HomeSettings = {
  intro: string;
  timezone: string;
  timezoneLabel: string;
  pgpId: string;
  socials: { name: string; url: string; icon: HomeSocialIcon }[];
};

const DEFAULT_HOME: HomeSettings = {
  intro:
    "Dedicated software engineering student with a focus on full-stack web development and special love for communities. Enthusiastic about creating and contributing to open-source projects while continually exploring and learning new technologies. Excited to take on innovative challenges and grow within the tech industry.",
  timezone: "Europe/Istanbul",
  timezoneLabel: "IST",
  pgpId: "A728E9CA9578CBA7",
  socials: [
    { name: "Github", url: "https://github.com/furkanunsalan", icon: "github" },
    {
      name: "Linkedin",
      url: "https://linkedin.com/in/furkanunsalan",
      icon: "linkedin",
    },
    { name: "Mail", url: "mailto:me@furkanunsalan.dev", icon: "mail" },
    { name: "CV", url: "/resume.pdf", icon: "cv" },
    {
      name: "Medium",
      url: "https://medium.com/@furkanunsalan",
      icon: "medium",
    },
    { name: "RSS", url: "/rss.xml", icon: "rss" },
  ],
};

export async function getHomeSettings(): Promise<HomeSettings> {
  const entry = await reader.singletons.home.read();
  if (!entry) return DEFAULT_HOME;
  return {
    intro: entry.intro || DEFAULT_HOME.intro,
    timezone: entry.timezone || DEFAULT_HOME.timezone,
    timezoneLabel: entry.timezoneLabel || DEFAULT_HOME.timezoneLabel,
    pgpId: entry.pgpId ?? DEFAULT_HOME.pgpId,
    socials:
      entry.socials && entry.socials.length > 0
        ? entry.socials
            .filter((s) => s.url && s.name)
            .map((s) => ({
              name: s.name,
              url: s.url,
              icon: s.icon as HomeSocialIcon,
            }))
        : DEFAULT_HOME.socials,
  };
}

export type GithubProjectVisibility = {
  // lowercased repo name -> { visible, pinned, pinIndex }
  byName: Map<string, { visible: boolean; pinned: boolean; pinIndex: number }>;
};

export async function getGithubProjectVisibility(): Promise<GithubProjectVisibility> {
  const entry = await reader.singletons.githubProjects.read();
  const repos = entry?.repos ?? [];
  const byName = new Map<
    string,
    { visible: boolean; pinned: boolean; pinIndex: number }
  >();
  let pinIndex = 0;
  for (const r of repos) {
    const key = (r.name || "").trim().toLowerCase();
    if (!key) continue;
    const pinned = !!r.pinned;
    byName.set(key, {
      visible: r.visible !== false, // default true
      pinned,
      pinIndex: pinned ? pinIndex++ : Number.MAX_SAFE_INTEGER,
    });
  }
  return { byName };
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
