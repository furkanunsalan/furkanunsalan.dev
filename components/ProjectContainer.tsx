import { Link } from "@/components/_compat";
import { Star, GitFork } from "lucide-react";
import type { ProjectCardData } from "@/types";
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
    <li>
      <Link
        href={`/projects/${project.slug}`}
        className="group block py-5 transition-colors"
      >
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
                <span className="whitespace-nowrap font-medium text-accent-primary/90">
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
      </Link>
    </li>
  );
}
