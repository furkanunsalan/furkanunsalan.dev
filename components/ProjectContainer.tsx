import Link from "next/link";
import { Star, GitFork, Sparkles } from "lucide-react";
import type { ProjectCardData } from "@/types";
import { languageColor } from "@/lib/language-colors";
import Sparkline from "@/components/admin/Sparkline";

export default function ProjectContainer({
  project,
}: {
  project: ProjectCardData;
}) {
  const language = project.language || undefined;
  const activity =
    project.kind === "github" ? project.commitActivity : undefined;
  const hasMeta = Boolean(language) || (activity && activity.length > 1);

  return (
    <Link
      href={`/projects/${project.slug}`}
      data-umami-event={project.name}
      className="card-interactive group block p-4"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/10"
          style={{ backgroundColor: languageColor(language) }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-base font-semibold text-white transition-colors duration-300 group-hover:text-accent-primary">
              {project.name}
            </p>
            <div className="flex shrink-0 items-center gap-3 text-sm text-light-fourth">
              {project.kind === "github" ? (
                <>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" />
                    {project.stargazers_count}
                  </span>
                  {project.forks_count > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <GitFork className="h-3.5 w-3.5" />
                      {project.forks_count}
                    </span>
                  )}
                </>
              ) : (
                project.metric && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-accent-primary/90">
                    <Sparkles className="h-3.5 w-3.5" />
                    {project.metric}
                  </span>
                )
              )}
            </div>
          </div>

          {project.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-light-secondary/80">
              {project.description}
            </p>
          )}

          {hasMeta && (
            <div className="mt-1.5 flex items-center gap-3 text-xs text-light-fourth">
              {language && <span>{language}</span>}
              {activity && activity.length > 1 && (
                <Sparkline
                  values={activity}
                  width={72}
                  height={16}
                  className="ml-auto text-accent-primary/60"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
