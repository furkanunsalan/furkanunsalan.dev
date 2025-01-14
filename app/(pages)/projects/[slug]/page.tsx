"use client";

import { find_by_slug } from "@/lib/project-finder";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loading from "@/components/Loading";
import Markdown from "markdown-to-jsx";
import type { Project } from "@/types";

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [readmeContent, setReadmeContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchedProject = find_by_slug(params.slug);
    if (!fetchedProject) {
      console.warn("Project not found with slug:", params.slug);
      router.replace("/not-found");
      return;
    }

    setProject(fetchedProject);

    if (!fetchedProject.private) {
      const fetchReadme = async () => {
        const { owner, repo, branch } = fetchedProject;
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
        console.log("Fetching README from:", url);

        try {
          const response = await fetch(url);
          if (response.ok) {
            let markdown = await response.text();

            // Replace image paths in the markdown
            markdown = markdown.replace(
              /!\[([^\]]*)\]\(([^)]+)\)/g,
              (match, altText, imageUrl) => {
                if (!/^https?:\/\//.test(imageUrl)) {
                  const baseUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;
                  const updatedImageUrl = `${baseUrl}${
                    imageUrl.startsWith("/") ? "" : "/"
                  }${imageUrl}`;
                  return `![${altText}](${updatedImageUrl})`;
                }
                return match;
              }
            );

            console.log("README content fetched successfully.");
            setReadmeContent(markdown);
          } else {
            console.warn(
              "Failed to fetch README content, status:",
              response.status
            );
            setReadmeContent("README not found for this project.");
          }
        } catch (error) {
          console.error("Error fetching README:", error);
          setReadmeContent("Error loading README content.");
        } finally {
          setLoading(false);
        }
      };

      fetchReadme();
    }

    document.title = `${fetchedProject.title} | Furkan Ünsalan`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        `Details and description of ${fetchedProject.title}`
      );
    } else {
      const newMetaTag = document.createElement("meta");
      newMetaTag.name = "description";
      newMetaTag.content = `Details and description of ${fetchedProject.title}`;
      document.head.appendChild(newMetaTag);
    }

    if (fetchedProject.private) {
      setLoading(false);
    }
  }, [params.slug, router]);

  if (loading) {
    return <Loading />;
  }

  if (!project) {
    return <p>Project not found.</p>;
  }

  if (project.private) {
    return (
      <div className="container mx-auto p-6 mt-32 text-center">
        <h1 className="text-3xl font-bold">{project.title}</h1>
        <p className="text-sm mt-6 text-zinc-900 dark:text-zinc-400">
          Last updated:{" "}
          {new Date(project.update).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </p>
        <p className="text-xl mt-12">{project.long_description}</p>
      </div>
    );
  }

  const markdownOptions = {
    overrides: {
      img: {
        props: {
          className: "rounded-lg",
        },
      },
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
    },
  };

  return (
    <div className="container mx-auto p-6 mt-32 text-center">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{project.repo}</h1>
        <p className="text-sm text-zinc-900 dark:text-zinc-400">
          Last updated:{" "}
          {new Date(project.update).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </p>
        <div className="prose dark:prose-invert mt-4 w-full lg:w-2/3 xl:w-1/2 mx-auto text-left">
          <Markdown options={markdownOptions}>{readmeContent}</Markdown>
        </div>
        <div className="flex flex-col items-center sm:flex-row sm:justify-center gap-4 lg:flex-col xl:flex-row mt-6">
          <a
            href={`https://github.com/${project.owner}/${project.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-white px-6 py-3 hover:bg-hover-dark bg-secondary-dark rounded-lg transition"
            data-umami-event={`${project.repo} Github`}
          >
            View on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
