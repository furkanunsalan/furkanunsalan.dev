import { projects } from "@/data/projects";

export function find_by_slug(slug: string) {
  const foundProject = projects.find((project) => project.slug === slug);
  return foundProject;
}
