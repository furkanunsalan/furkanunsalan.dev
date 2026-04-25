import GithubCommitHistory from "@/components/GithubCommitHistory";
import ProjectContainer from "@/components/ProjectContainer";
import { getGithubRepos } from "@/lib/github";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects | Furkan Ünsalan",
  description:
    "A collection of my public open-source projects on GitHub, sorted by stars.",
};

export const revalidate = 3600;

export default async function Projects() {
  const repos = await getGithubRepos();

  return (
    <div className="mt-24 min-h-screen max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-12">
        <GithubCommitHistory />
      </div>
      <div className="grid grid-cols-1 gap-4">
        {repos.map((repo) => (
          <ProjectContainer key={repo.name} repo={repo} />
        ))}
      </div>
    </div>
  );
}
