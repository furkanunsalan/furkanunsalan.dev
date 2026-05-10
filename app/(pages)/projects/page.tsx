import GithubCommitHistory from "@/components/GithubCommitHistory";
import ProjectContainer from "@/components/ProjectContainer";
import { getCustomProjects, getGithubProjectVisibility } from "@/lib/content";
import { getGithubRepos } from "@/lib/github";
import type { ProjectCardData } from "@/types";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects | Furkan Ünsalan",
  description:
    "Public open-source GitHub projects plus a few hand-curated builds.",
};

export const revalidate = 3600;

export default async function Projects() {
  const [repos, custom, visibility] = await Promise.all([
    getGithubRepos().catch(() => []),
    getCustomProjects().catch(() => []),
    getGithubProjectVisibility().catch(() => ({ byName: new Map() })),
  ]);

  const customCards: ProjectCardData[] = custom.map((p) => ({
    kind: "custom",
    slug: p.slug,
    name: p.name,
    description: p.description,
    language: p.language,
    metric: p.metric,
    link: p.link,
    image: p.image,
  }));

  // A repo is excluded if:
  //   - a custom project has the same slug (custom wins), OR
  //   - the Keystatic singleton has it as visible=false.
  // Repos missing from the singleton default to visible (newly-discovered).
  const customSlugs = new Set(custom.map((p) => p.slug.toLowerCase()));
  const visibleRepos = repos.filter((r) => {
    if (customSlugs.has(r.name.toLowerCase())) return false;
    const entry = visibility.byName.get(r.name.toLowerCase());
    return entry ? entry.visible : true;
  });

  // Pinned repos float to the top in the order the user arranged them in the
  // singleton's array. Non-pinned keep the default star-sorted order.
  visibleRepos.sort((a, b) => {
    const ea = visibility.byName.get(a.name.toLowerCase());
    const eb = visibility.byName.get(b.name.toLowerCase());
    const ai = ea?.pinned ? ea.pinIndex : Number.MAX_SAFE_INTEGER;
    const bi = eb?.pinned ? eb.pinIndex : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return b.stargazers_count - a.stargazers_count;
  });

  const githubCards: ProjectCardData[] = visibleRepos.map((r) => ({
    kind: "github",
    slug: r.name,
    name: r.name,
    description: r.description,
    language: r.language,
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
  }));

  const cards = [...customCards, ...githubCards];

  return (
    <div className="mt-24 min-h-screen max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-12 animate-fade-in">
        <GithubCommitHistory />
      </div>
      <div className="grid grid-cols-1 gap-4 stagger">
        {cards.map((card) => (
          <ProjectContainer key={card.slug} project={card} />
        ))}
      </div>
    </div>
  );
}
