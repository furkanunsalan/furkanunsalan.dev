import GithubCommitHistory from "@/components/GithubCommitHistory";
import ProjectsExplorer from "@/components/ProjectsExplorer";
import SshChip from "@/components/SshChip";
import { getCustomProjects, getGithubProjectVisibility } from "@/lib/content";
import { getGithubRepos, getRepoCommitActivity } from "@/lib/github";
import type { ProjectCardData } from "@/types";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects | Furkan Ünsalan",
  description:
    "Public open-source GitHub projects plus a few hand-curated builds.",
};

// DB-backed: avoid prerender at build time (CI has no access to the VPS pg).
export const dynamic = "force-dynamic";

export default async function Projects() {
  const [repos, custom, visibility] = await Promise.all([
    getGithubRepos().catch((e) => {
      console.error("[/projects] getGithubRepos failed:", e);
      return [];
    }),
    getCustomProjects().catch((e) => {
      console.error("[/projects] getCustomProjects failed:", e);
      return [];
    }),
    getGithubProjectVisibility().catch((e) => {
      console.error("[/projects] getGithubProjectVisibility failed:", e);
      return { byName: new Map() };
    }),
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
    order: p.order,
  }));

  // A repo is excluded if:
  //   - a custom project has the same slug (custom wins), OR
  //   - the visibility singleton has it as visible=false.
  // Repos missing from the singleton default to visible (newly-discovered).
  const customSlugs = new Set(custom.map((p) => p.slug.toLowerCase()));
  const visibleRepos = repos.filter((r) => {
    if (customSlugs.has(r.name.toLowerCase())) return false;
    const entry = visibility.byName.get(r.name.toLowerCase());
    return entry ? entry.visible : true;
  });

  // Weekly commit totals per repo drive the card sparklines. Cached at the
  // fetch layer (6h) and degrade to [] on error, so this stays cheap.
  const activities = await Promise.all(
    visibleRepos.map((r) =>
      getRepoCommitActivity(r.owner, r.name).catch(() => []),
    ),
  );

  const githubCards: ProjectCardData[] = visibleRepos.map((r, i) => ({
    kind: "github",
    slug: r.name,
    name: r.name,
    description: r.description,
    language: r.language,
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
    pushed_at: r.pushed_at,
    commitActivity: activities[i],
  }));

  // One unified order across custom + GitHub: custom projects use their `order`
  // field; pinned repos use their `pinOrder` on the same scale, so a repo can
  // sit between two custom builds. Everything unpinned trails, sorted by stars.
  const rankOf = (c: ProjectCardData): number => {
    if (c.kind === "custom") return c.order;
    const entry = visibility.byName.get(c.slug.toLowerCase());
    return entry?.pinned ? entry.pinOrder : Number.MAX_SAFE_INTEGER;
  };
  const cards = [...customCards, ...githubCards].sort((a, b) => {
    const ra = rankOf(a);
    const rb = rankOf(b);
    if (ra !== rb) return ra - rb;
    const sa = a.kind === "github" ? a.stargazers_count : 0;
    const sb = b.kind === "github" ? b.stargazers_count : 0;
    return sb - sa;
  });

  return (
    <div className="mt-24 pb-24 min-h-screen max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 animate-fade-in-down sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-white">Projects</h1>
        <SshChip className="max-w-full" />
      </div>
      <div className="mb-10 animate-fade-in">
        <GithubCommitHistory />
      </div>
      <div className="animate-fade-in">
        <ProjectsExplorer cards={cards} />
      </div>
    </div>
  );
}
