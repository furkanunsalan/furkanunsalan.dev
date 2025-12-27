import { getContentfulProjectBySlug } from "@/lib/contentful";

export async function find_by_slug(slug: string) {
  const foundProject = await getContentfulProjectBySlug(slug);
  return foundProject;
}
