"use client";

import React from "react";
import type { GithubRepo } from "@/lib/github";
import { useRouter } from "next/navigation";
import { Star, GitFork } from "lucide-react";

export default function ProjectContainer({ repo }: { repo: GithubRepo }) {
  const router = useRouter();

  const handleNavigation = () => {
    router.push(`/projects/${repo.name}`);
  };

  return (
    <div
      className="card-interactive group w-full p-4 flex justify-between items-start gap-4 cursor-pointer"
      onClick={handleNavigation}
      data-umami-event={repo.name}
    >
      <div className="space-y-1 min-w-0 flex-1">
        <p className="text-lg font-semibold text-white group-hover:text-accent-primary transition-colors duration-300 truncate">
          {repo.name}
        </p>
        {repo.description && (
          <p className="text-light-secondary/80 text-sm line-clamp-2">
            {repo.description}
          </p>
        )}
        {repo.language && (
          <p className="text-xs text-light-fourth pt-1">{repo.language}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 text-light-fourth text-sm flex-shrink-0">
        <span className="inline-flex items-center gap-1">
          <Star className="w-3.5 h-3.5" />
          {repo.stargazers_count}
        </span>
        {repo.forks_count > 0 && (
          <span className="inline-flex items-center gap-1">
            <GitFork className="w-3.5 h-3.5" />
            {repo.forks_count}
          </span>
        )}
      </div>
    </div>
  );
}
