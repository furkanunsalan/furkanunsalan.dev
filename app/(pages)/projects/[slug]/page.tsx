"use client";

import { find_by_slug } from "@/lib/project-finder";
import { Project } from "@/types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loading from "@/components/Loading";

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchedProject = find_by_slug(params.slug);
    if (!fetchedProject) {
      router.replace("/not-found");
    } else {
      setProject(fetchedProject);
      setLoading(false);
    }
  }, [params.slug, router]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="container mx-auto p-6 text-center">
      {project ? (
        <div className="space-y-6">
          {project.image && (
            <img
              src={project.image}
              alt={project.title}
              className="w-full h-auto rounded-lg shadow-lg mt-4"
            />
          )}
          <h1 className="text-3xl font-bold">{project.title}</h1>
          <p className="text-sm text-zinc-900 dark:text-zinc-400">
            Last updated: {project.update}
          </p>
          <p className="text-lg w-full lg:w-1/2 xl:w-1/3 mx-auto text-left">
            {project.short_description}
          </p>
          <div
            className="mt-4 w-full lg:w-1/2 xl:w-1/3 mx-auto text-left"
            dangerouslySetInnerHTML={{ __html: project.description }}
          />

          <div className="flex flex-col items-center sm:flex-row sm:justify-center gap-4 lg:flex-col xl:flex-row mt-6">
            {project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-white px-6 py-3 hover:bg-hover-dark bg-secondary-dark rounded-lg transition"
                data-umami-event={project.slug + " Website"}
              >
                Visit the Site
              </a>
            )}

            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-white px-6 py-3 hover:bg-hover-dark bg-secondary-dark rounded-lg transition"
                data-umami-event={project.slug + " Github"}
              >
                View on GitHub
              </a>
            )}
          </div>
        </div>
      ) : (
        <p>Project not found.</p>
      )}
    </div>
  );
}
