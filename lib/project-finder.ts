import { getGithubRepo } from "@/lib/github";

export async function find_by_slug(slug: string) {
  return getGithubRepo(slug);
}
