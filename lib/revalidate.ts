import { bustTag } from "@/lib/cache";

// Collections whose cached readers (lib/cache.ts) share the collection name as
// their tag. Admin mutations call revalidateCollection(name) to bust them.
export type Collection =
  | "posts"
  | "projects"
  | "experiences"
  | "tools"
  | "places"
  | "placeLists"
  | "photos"
  | "home"
  | "github"
  | "thoughts"
  | "cv";

// Some edits ripple across collections (e.g. a post also affects the home feed).
const RIPPLE: Partial<Record<Collection, Collection[]>> = {
  posts: ["thoughts"],
  thoughts: ["posts"],
};

export function revalidateCollection(
  collection: Collection,
  _slug?: string,
): void {
  bustTag(collection);
  for (const also of RIPPLE[collection] ?? []) bustTag(also);
}
