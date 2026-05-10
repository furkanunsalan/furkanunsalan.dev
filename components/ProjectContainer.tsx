"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Star, GitFork, Sparkles } from "lucide-react";
import type { ProjectCardData } from "@/types";

export default function ProjectContainer({
  project,
}: {
  project: ProjectCardData;
}) {
  const router = useRouter();

  const handleNavigation = () => {
    router.push(`/projects/${project.slug}`);
  };

  return (
    <div
      className="card-interactive group w-full p-4 flex justify-between items-start gap-4 cursor-pointer"
      onClick={handleNavigation}
      data-umami-event={project.name}
    >
      <div className="space-y-1 min-w-0 flex-1">
        <p className="text-lg font-semibold text-white group-hover:text-accent-primary transition-colors duration-300 truncate">
          {project.name}
        </p>
        {project.description && (
          <p className="text-light-secondary/80 text-sm line-clamp-2">
            {project.description}
          </p>
        )}
        {project.language && (
          <p className="text-xs text-light-fourth pt-1">{project.language}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 text-light-fourth text-sm flex-shrink-0">
        {project.kind === "github" ? (
          <>
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5" />
              {project.stargazers_count}
            </span>
            {project.forks_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <GitFork className="w-3.5 h-3.5" />
                {project.forks_count}
              </span>
            )}
          </>
        ) : (
          <span className="inline-flex items-center gap-1 text-accent-primary/90 font-medium whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5" />
            {project.metric}
          </span>
        )}
      </div>
    </div>
  );
}
