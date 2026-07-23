import { notFound } from "next/navigation";
import Markdown from "markdown-to-jsx";
import Markdoc from "@markdoc/markdoc";
import React from "react";
import SmartImage from "@/components/SmartImage";
import { Metadata } from "next";
import { Star, GitFork, ExternalLink, Sparkles } from "lucide-react";
import { getGithubRepo, getGithubReadme } from "@/lib/github";
import { getCustomProjectBySlug } from "@/lib/content";
import InfraShowcase from "@/components/InfraShowcase";
import TeachfluenceStudioShowcase from "@/components/TeachfluenceStudioShowcase";

const BESPOKE = {
  "multigroup-infra": InfraShowcase,
  "teachfluence-studio": TeachfluenceStudioShowcase,
} as const;

// DB-backed: rendered on demand. Skipping generateStaticParams means CI never
// tries to call the VPS pg at build time.
export const dynamic = "force-dynamic";

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
      props: { className: "bg-zinc-900 px-1.5 py-0.5 rounded text-sm" },
    },
    pre: {
      props: { className: "bg-zinc-900 p-4 rounded-lg overflow-x-auto" },
    },
  },
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const custom = await getCustomProjectBySlug(params.slug);
  if (custom) {
    return {
      title: `${custom.name} | Furkan Ünsalan`,
      description: custom.description || `Details for ${custom.name}`,
    };
  }

  const repo = await getGithubRepo(params.slug);
  if (!repo) return { title: "Project Not Found | Furkan Ünsalan" };

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
  const custom = await getCustomProjectBySlug(params.slug);
  if (custom) {
    const Bespoke = BESPOKE[custom.slug as keyof typeof BESPOKE];
    if (Bespoke) return <Bespoke project={custom} />;
    const transformed = Markdoc.transform(custom.node);
    const rendered = Markdoc.renderers.react(transformed, React);
    return (
      <div className="mt-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-white">{custom.name}</h1>
          {custom.description && (
            <p className="mt-2 text-light-secondary/80">{custom.description}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-light-fourth">
            {custom.metric && (
              <span className="inline-flex items-center gap-1 text-accent-primary/90 font-medium">
                <Sparkles className="w-4 h-4" />
                {custom.metric}
              </span>
            )}
            {custom.language && <span>{custom.language}</span>}
          </div>
          {custom.link && (
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={custom.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.06] bg-zinc-950 hover:border-accent-primary/50 hover:-translate-y-0.5 hover:shadow-[0_0_24px_-12px_rgba(99,102,241,0.6)] transition-all duration-300 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Visit
              </a>
            </div>
          )}
        </header>

        {custom.image && (
          <div className="relative w-full aspect-[16/9] overflow-hidden rounded-xl border border-white/[0.06] mb-8 animate-fade-in delay-100">
            <SmartImage
              src={custom.image}
              alt={custom.name}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        )}

        <article className="prose prose-invert max-w-none animate-fade-in delay-150 prose-a:text-accent-primary prose-blockquote:border-l-accent-primary prose-code:text-accent-primary prose-headings:text-white">
          {rendered}
        </article>
      </div>
    );
  }

  const repo = await getGithubRepo(params.slug);
  if (!repo) notFound();

  const readme = await getGithubReadme(
    repo.owner,
    repo.name,
    repo.default_branch,
  );

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
