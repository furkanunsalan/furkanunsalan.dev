import { getCustomProjectBySlug } from "@/lib/content";
import { getGithubRepo } from "@/lib/github";
import { OG_SIZE, OG_CONTENT_TYPE, renderOgImage } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Furkan Ünsalan — Project";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OG({ params }: { params: { slug: string } }) {
  const custom = await getCustomProjectBySlug(params.slug).catch(() => null);
  if (custom) {
    return renderOgImage({
      eyebrow: "Project · furkanunsalan.dev",
      title: custom.name,
      subtitle: custom.metric || custom.description || undefined,
      footer: "furkanunsalan.dev/projects",
    });
  }

  const repo = await getGithubRepo(params.slug).catch(() => null);
  return renderOgImage({
    eyebrow: "Project · furkanunsalan.dev",
    title: repo?.name ?? "Project",
    subtitle: repo
      ? `${repo.stargazers_count} stars${repo.language ? ` · ${repo.language}` : ""}`
      : undefined,
    footer: "furkanunsalan.dev/projects",
  });
}
