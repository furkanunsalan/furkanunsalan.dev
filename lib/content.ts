import "server-only";
import Markdoc from "@markdoc/markdoc";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cachedReader } from "@/lib/cache";
import type {
  CvHeader,
  CvContact,
  CvCert,
  CvLanguage,
  CvEducationItem,
  CvProjectSel,
  CvExperienceSel,
} from "@/db/schema";
import type {
  BlogPost,
  CustomProject,
  Experience,
  Place,
  PlaceStatus,
  Thought,
  Tool,
} from "@/types";

// Reads are cached in Next's data cache and busted per-collection tag by
// lib/revalidate.ts on every admin mutation (see cachedReader). Readers that
// return a Markdoc AST node or a Map aren't serializable, so they stay uncached.

// ---- shared helpers ----------------------------------------------------

function bannerUrl(
  slug: string,
  value: string | null | undefined,
): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  if (value.startsWith("/")) return value;
  return `/posts/${value}`;
}

function projectImageUrl(value: string | null | undefined): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  if (value.startsWith("/")) return value;
  return `/projects/${value}`;
}

function experienceImageUrl(value: string): string {
  return value.startsWith("/") ? value : `/experiences/${value}`;
}

// ---- posts ------------------------------------------------------------

async function getPostsQuery(): Promise<BlogPost[]> {
  const rows = await db
    .select()
    .from(schema.posts)
    .where(and(eq(schema.posts.draft, false), isNull(schema.posts.deletedAt)))
    .orderBy(desc(schema.posts.date));
  return rows.map((r) => {
    const post: BlogPost = {
      slug: r.slug,
      title: r.title,
      date: String(r.date),
      tags: r.tags,
    };
    const banner = bannerUrl(r.slug, r.banner);
    if (banner) post.banner = banner;
    if (r.excerpt) post.excerpt = r.excerpt;
    const words = (r.content || "").split(/\s+/).filter(Boolean).length;
    if (words > 0) {
      post.readingTime = `${Math.max(1, Math.ceil(words / 200))} min read`;
    }
    return post;
  });
}
export const getPosts = cachedReader(
  ["getPosts"],
  ["posts"],
  getPostsQuery,
  [],
);

// Returns a Markdoc AST node — not serializable, so this reader stays uncached.
export async function getPostBySlug(slug: string) {
  const [r] = await db
    .select()
    .from(schema.posts)
    .where(and(eq(schema.posts.slug, slug), isNull(schema.posts.deletedAt)))
    .limit(1);
  if (!r) return null;
  const node = Markdoc.parse(r.content || "");
  return {
    slug: r.slug,
    title: r.title,
    date: String(r.date),
    tags: r.tags,
    banner: bannerUrl(r.slug, r.banner),
    node,
  };
}

// Lightweight read used by OG images and other places that only need the
// metadata — skips the Markdoc parse of the body.
async function getPostMetaBySlugQuery(
  slug: string,
): Promise<{ slug: string; title: string; date: string } | null> {
  const [r] = await db
    .select({
      slug: schema.posts.slug,
      title: schema.posts.title,
      date: schema.posts.date,
    })
    .from(schema.posts)
    .where(and(eq(schema.posts.slug, slug), isNull(schema.posts.deletedAt)))
    .limit(1);
  return r ? { slug: r.slug, title: r.title, date: String(r.date) } : null;
}
export const getPostMetaBySlug = cachedReader(
  ["getPostMetaBySlug"],
  ["posts"],
  getPostMetaBySlugQuery,
  null,
);

// ---- experiences ------------------------------------------------------

async function getExperiencesQuery(): Promise<Experience[]> {
  const rows = await db
    .select()
    .from(schema.experiences)
    .where(isNull(schema.experiences.deletedAt));

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB") : "";
  const parseDDMMYYYY = (s: string) => {
    const [d, m, y] = s.split("/").map(Number);
    return new Date(y || 0, (m || 1) - 1, d || 1).getTime();
  };

  // Primary sort: most-recent start date. Tiebreak with the `order` field so
  // the admin's manual order still has meaning when two roles started in the
  // same month (e.g. roles at the same company starting on 2024-01-01).
  const sorted = [...rows].sort((a, b) => {
    const ta = a.startDate
      ? parseDDMMYYYY(fmt(a.startDate as unknown as string))
      : 0;
    const tb = b.startDate
      ? parseDDMMYYYY(fmt(b.startDate as unknown as string))
      : 0;
    if (tb !== ta) return tb - ta;
    return (a.order ?? 100) - (b.order ?? 100);
  });

  return sorted.map((r, i) => ({
    // Synthetic numeric id only used as a React key on the list; assigned
    // after sort so it matches display order.
    id: i + 1,
    slug: r.id,
    kind: r.kind,
    order: r.order,
    organization: r.organization,
    title: r.title,
    start_date: fmt(r.startDate as unknown as string),
    end_date: r.endDate ? fmt(r.endDate as unknown as string) : undefined,
    comment: r.comment,
    logo: r.logo ? experienceImageUrl(r.logo) : undefined,
    links: (r.links || [])
      .filter((l) => !!l.url)
      .map((l) => ({ label: l.label, url: l.url })),
    images: (r.images || []).map(experienceImageUrl),
  }));
}
export const getExperiences = cachedReader(
  ["getExperiences"],
  ["experiences"],
  getExperiencesQuery,
  [],
);

// ---- projects (custom) ------------------------------------------------

async function getCustomProjectsQuery(): Promise<CustomProject[]> {
  const rows = await db
    .select()
    .from(schema.projects)
    .where(isNull(schema.projects.deletedAt))
    .orderBy(asc(schema.projects.order));
  return rows.map((r) => {
    const image = projectImageUrl(r.image);
    const project: CustomProject = {
      slug: r.slug,
      name: r.name,
      description: r.description,
      metric: r.metric,
      link: r.link,
      order: r.order,
      ...(r.language ? { language: r.language } : {}),
      ...(image ? { image } : {}),
    };
    return project;
  });
}
export const getCustomProjects = cachedReader(
  ["getCustomProjects"],
  ["projects"],
  getCustomProjectsQuery,
  [],
);

// Returns a Markdoc AST node — not serializable, so this reader stays uncached.
export async function getCustomProjectBySlug(slug: string) {
  const [r] = await db
    .select()
    .from(schema.projects)
    .where(
      and(eq(schema.projects.slug, slug), isNull(schema.projects.deletedAt)),
    )
    .limit(1);
  if (!r) return null;
  const node = Markdoc.parse(r.content || "");
  return {
    slug: r.slug,
    name: r.name,
    description: r.description,
    metric: r.metric,
    link: r.link,
    language: r.language || undefined,
    order: r.order,
    image: projectImageUrl(r.image),
    node,
  };
}

// ---- photos -----------------------------------------------------------

export type Photo = {
  id: string;
  width: number;
  height: number;
  color: string;
  blurHash: string | null;
  alt: string;
  caption: string;
  takenAt: string | null;
  camera: string | null;
  focalLength: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: number | null;
  tags: string[];
  display: string;
  thumb: string;
};

async function getPhotosQuery(): Promise<Photo[]> {
  const rows = await db
    .select()
    .from(schema.photos)
    .where(isNull(schema.photos.deletedAt))
    .orderBy(desc(schema.photos.takenAt), asc(schema.photos.order));
  return rows.map((r) => {
    const make = r.cameraMake?.trim();
    const model = r.cameraModel?.trim();
    const camera = model
      ? make && !model.toLowerCase().includes(make.toLowerCase())
        ? `${make} ${model}`
        : model
      : make || null;
    return {
      id: r.id,
      width: r.width,
      height: r.height,
      color: r.color,
      blurHash: r.blurHash,
      alt: r.alt,
      caption: r.caption,
      takenAt: r.takenAt ? new Date(r.takenAt).toISOString() : null,
      camera,
      focalLength: r.focalLength,
      aperture: r.aperture,
      shutter: r.shutter,
      iso: r.iso,
      tags: r.tags ?? [],
      display: `/api/img/photos/display/${r.id}.webp`,
      thumb: `/api/img/photos/thumb/${r.id}.webp`,
    };
  });
}
export const getPhotos = cachedReader(
  ["getPhotos"],
  ["photos"],
  getPhotosQuery,
  [],
);

// ---- home singleton ---------------------------------------------------

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
  location: string;
  focus: string;
  watching: string;
  timezone: string;
  timezoneLabel: string;
  pgpId: string;
  socials: { name: string; url: string; icon: HomeSocialIcon }[];
};

const DEFAULT_HOME: HomeSettings = {
  intro:
    "Dedicated software engineering student with a focus on full-stack web development and special love for communities. Enthusiastic about creating and contributing to open-source projects while continually exploring and learning new technologies. Excited to take on innovative challenges and grow within the tech industry.",
  location: "Istanbul, TR",
  focus: "full-stack · privacy · self-hosting",
  watching: "Star Wars: Andor · Rick and Morty",
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
    { name: "CV", url: "/resume", icon: "cv" },
    {
      name: "Medium",
      url: "https://medium.com/@furkanunsalan",
      icon: "medium",
    },
    { name: "RSS", url: "/rss.xml", icon: "rss" },
  ],
};

async function getHomeSettingsQuery(): Promise<HomeSettings> {
  const [r] = await db
    .select()
    .from(schema.homeSettings)
    .where(eq(schema.homeSettings.id, 1))
    .limit(1);
  // When no row exists at all, fall back. When a row exists, trust it — even
  // if the admin chose to clear socials, an empty array is intentional.
  if (!r) return DEFAULT_HOME;
  const socials = (r.socials || []).filter((s) => s && s.url && s.name);
  return {
    intro: r.intro || DEFAULT_HOME.intro,
    location: r.location || DEFAULT_HOME.location,
    focus: r.focus || DEFAULT_HOME.focus,
    watching: r.watching || DEFAULT_HOME.watching,
    timezone: r.timezone || DEFAULT_HOME.timezone,
    timezoneLabel: r.timezoneLabel || DEFAULT_HOME.timezoneLabel,
    pgpId: r.pgpId ?? DEFAULT_HOME.pgpId,
    socials: socials.map((s) => ({
      name: s.name,
      url: s.url,
      icon: s.icon as HomeSocialIcon,
    })),
  };
}
export const getHomeSettings = cachedReader(
  ["getHomeSettings"],
  ["home"],
  getHomeSettingsQuery,
  DEFAULT_HOME,
);

// ---- github project visibility ----------------------------------------

export type GithubProjectVisibility = {
  byName: Map<
    string,
    { visible: boolean; pinned: boolean; pinIndex: number; pinOrder: number }
  >;
};

// Returns a Map — not serializable, so this reader stays uncached.
export async function getGithubProjectVisibility(): Promise<GithubProjectVisibility> {
  let rows: (typeof schema.githubProjectVisibility.$inferSelect)[] = [];
  try {
    rows = await db
      .select()
      .from(schema.githubProjectVisibility)
      .orderBy(asc(schema.githubProjectVisibility.pinOrder));
  } catch (e) {
    console.error("[getGithubProjectVisibility] query failed:", e);
    return { byName: new Map() };
  }
  const byName = new Map<
    string,
    { visible: boolean; pinned: boolean; pinIndex: number; pinOrder: number }
  >();
  let pinIndex = 0;
  for (const r of rows) {
    const key = (r.name || "").trim().toLowerCase();
    if (!key) continue;
    const pinned = !!r.pinned;
    byName.set(key, {
      visible: r.visible !== false,
      pinned,
      pinIndex: pinned ? pinIndex++ : Number.MAX_SAFE_INTEGER,
      pinOrder: r.pinOrder ?? 0,
    });
  }
  return { byName };
}

// ---- places -----------------------------------------------------------

async function getPlacesQuery(): Promise<Place[]> {
  const rows = await db
    .select()
    .from(schema.places)
    .where(isNull(schema.places.deletedAt))
    .orderBy(desc(schema.places.addedAt), asc(schema.places.name));
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    address: r.address || undefined,
    list: r.list || undefined,
    category: r.category || undefined,
    country: r.country || undefined,
    city: r.city || undefined,
    status: r.status as PlaceStatus,
    sourceUrl: r.sourceUrl || undefined,
    addedAt: r.addedAt ? r.addedAt.toISOString() : undefined,
    tags: r.tags || [],
    notes: r.notes || undefined,
  }));
}
export const getPlaces = cachedReader(
  ["getPlaces"],
  ["places"],
  getPlacesQuery,
  [],
);

// ---- place lists ------------------------------------------------------

export type PlaceListMeta = { name: string; icon: string; position: number };

async function getPlaceListsQuery(): Promise<PlaceListMeta[]> {
  const rows = await db
    .select({
      name: schema.placeLists.name,
      icon: schema.placeLists.icon,
      position: schema.placeLists.position,
    })
    .from(schema.placeLists)
    .orderBy(asc(schema.placeLists.position), asc(schema.placeLists.name));
  return rows;
}
export const getPlaceLists = cachedReader(
  ["getPlaceLists"],
  ["placeLists"],
  getPlaceListsQuery,
  [],
);

// ---- tools ------------------------------------------------------------

async function getToolsQuery(): Promise<Tool[]> {
  const rows = await db
    .select()
    .from(schema.tools)
    .where(isNull(schema.tools.deletedAt))
    .orderBy(asc(schema.tools.order), asc(schema.tools.name));
  return rows.map((r, i) => ({
    id: i + 1,
    name: r.name,
    brand: r.brand,
    what: r.what,
    category: r.category,
    order: r.order,
    comment: r.comment,
    favorite: r.favorite,
    link: r.link ?? undefined,
    icon: r.icon ?? undefined,
  }));
}
export const getTools = cachedReader(
  ["getTools"],
  ["tools"],
  getToolsQuery,
  [],
);

// ---- thoughts ---------------------------------------------------------

async function getThoughtsQuery({ limit }: { limit?: number } = {}): Promise<
  Thought[]
> {
  const q = db
    .select()
    .from(schema.thoughts)
    .where(
      and(eq(schema.thoughts.draft, false), isNull(schema.thoughts.deletedAt)),
    )
    .orderBy(desc(schema.thoughts.createdAt));
  const rows = typeof limit === "number" ? await q.limit(limit) : await q;
  return rows.map((r) => ({
    id: r.id,
    body: r.body || "",
    images: r.images || [],
    tags: r.tags || [],
    createdAt: r.createdAt.toISOString(),
  }));
}
export const getThoughts = cachedReader(
  ["getThoughts"],
  ["thoughts"],
  getThoughtsQuery,
  [],
);

async function getLatestThoughtQuery(): Promise<Thought | null> {
  const [r] = await db
    .select()
    .from(schema.thoughts)
    .where(
      and(eq(schema.thoughts.draft, false), isNull(schema.thoughts.deletedAt)),
    )
    .orderBy(desc(schema.thoughts.createdAt))
    .limit(1);
  if (!r) return null;
  return {
    id: r.id,
    body: r.body || "",
    images: r.images || [],
    tags: r.tags || [],
    createdAt: r.createdAt.toISOString(),
  };
}
export const getLatestThought = cachedReader(
  ["getLatestThought"],
  ["thoughts"],
  getLatestThoughtQuery,
  null,
);

// ---- cv settings (singleton) -----------------------------------------

export type CvSettings = {
  header: CvHeader;
  contact: CvContact;
  summary: string;
  skills: string[];
  certifications: CvCert[];
  languages: CvLanguage[];
  education: CvEducationItem[];
  projects: CvProjectSel[];
  experiences: CvExperienceSel[];
};

const CV_DEFAULTS: CvSettings = {
  header: { name: "", role: "" },
  contact: { address: "", phone: "", web: "" },
  summary: "",
  skills: [],
  certifications: [],
  languages: [],
  education: [],
  projects: [],
  experiences: [],
};

async function getCvSettingsQuery(): Promise<CvSettings> {
  const [row] = await db
    .select()
    .from(schema.cvSettings)
    .where(eq(schema.cvSettings.id, 1))
    .limit(1);
  if (!row) return CV_DEFAULTS;
  return {
    header: row.header,
    contact: row.contact,
    summary: row.summary,
    skills: row.skills,
    certifications: row.certifications,
    languages: row.languages,
    education: row.education,
    projects: row.projects,
    experiences: row.experiences,
  };
}
export const getCvSettings = cachedReader(
  ["getCvSettings"],
  ["cv"],
  getCvSettingsQuery,
  CV_DEFAULTS,
);
