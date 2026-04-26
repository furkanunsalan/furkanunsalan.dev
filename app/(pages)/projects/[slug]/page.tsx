import { notFound } from "next/navigation";
import Markdown from "markdown-to-jsx";
import { Metadata } from "next";
import { Star, GitFork, ExternalLink } from "lucide-react";
import { getGithubRepo, getGithubReadme } from "@/lib/github";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const repo = await getGithubRepo(params.slug);

  if (!repo) {
    return {
      title: "Project Not Found | Furkan Ünsalan",
    };
  }

  return {
    title: `${repo.name} | Furkan Ünsalan`,
    description: repo.description ?? `Details for ${repo.name}`,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: { slug: string };
}) {
  const repo = await getGithubRepo(params.slug);
  if (!repo) notFound();

  const readme = await getGithubReadme(
    repo.owner,
    repo.name,
    repo.default_branch,
  );

  const markdownOptions = {
    overrides: {
      img: { props: { className: "rounded-lg" } },
      a: {
        props: {
          className: "text-accent-primary hover:underline",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      },
      h1: { props: { className: "text-3xl font-bold mt-6 mb-4" } },
      h2: { props: { className: "text-2xl font-semibold mt-4 mb-3" } },
      h3: { props: { className: "text-xl font-semibold mt-3 mb-2" } },
      p: { props: { className: "mb-4" } },
      code: {
        props: {
          className: "bg-zinc-900 px-1.5 py-0.5 rounded text-sm",
        },
      },
      pre: {
        props: {
          className: "bg-zinc-900 p-4 rounded-lg overflow-x-auto",
        },
      },
    },
  };

  return (
    <div className="mt-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <header className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-white">{repo.name}</h1>
        {repo.description && (
          <p className="mt-2 text-light-secondary/80">{repo.description}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-light-fourth">
          <span className="inline-flex items-center gap-1">
            <Star className="w-4 h-4" />
            {repo.stargazers_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitFork className="w-4 h-4" />
            {repo.forks_count}
          </span>
          {repo.language && <span>{repo.language}</span>}
          <span>
            Updated{" "}
            {new Date(repo.pushed_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.06] bg-zinc-950 hover:border-accent-primary/50 hover:-translate-y-0.5 hover:shadow-[0_0_24px_-12px_rgba(99,102,241,0.6)] transition-all duration-300 text-sm"
            data-umami-event={`${repo.name} Github`}
          >
            <ExternalLink className="w-4 h-4" />
            View on GitHub
          </a>
          {repo.homepage && (
            <a
              href={repo.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.06] bg-zinc-950 hover:border-accent-primary/50 hover:-translate-y-0.5 hover:shadow-[0_0_24px_-12px_rgba(99,102,241,0.6)] transition-all duration-300 text-sm"
              data-umami-event={`${repo.name} Homepage`}
            >
              <ExternalLink className="w-4 h-4" />
              Live
            </a>
          )}
        </div>
      </header>

      {readme ? (
        <article className="prose prose-invert max-w-none animate-fade-in delay-150">
          <Markdown options={markdownOptions}>{readme}</Markdown>
        </article>
      ) : (
        <p className="text-light-fourth animate-fade-in">
          No README found for this project.
        </p>
      )}
    </div>
  );
}
