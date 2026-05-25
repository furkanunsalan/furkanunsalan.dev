import { revalidatePath } from "next/cache";

// Per-collection list of public paths to invalidate on mutation. Keeping this
// in one place prevents the "I edited a post but the home / RSS still shows
// the old title" class of bug — forgetting one path was easy when each route
// had its own copies.
const COLLECTION_PATHS: Record<string, readonly string[]> = {
  posts: ["/writing", "/", "/rss.xml"],
  projects: ["/projects", "/"],
  experiences: ["/experience", "/"],
  tools: ["/", "/api/tools"],
  places: ["/places"],
  placeLists: ["/places"],
  home: ["/"],
  github: ["/projects"],
};

// Per-collection optional dynamic-detail path. Only collections with public
// detail routes (`/writing/[slug]`, `/projects/[slug]`) get one.
const DETAIL_PATHS: Partial<Record<keyof typeof COLLECTION_PATHS, string>> = {
  posts: "/writing",
  projects: "/projects",
};

export function revalidateCollection(
  collection: keyof typeof COLLECTION_PATHS,
  slug?: string,
): void {
  for (const p of COLLECTION_PATHS[collection]) revalidatePath(p);
  const detailPrefix = DETAIL_PATHS[collection];
  if (slug && detailPrefix) revalidatePath(`${detailPrefix}/${slug}`);
}
