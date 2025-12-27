import GithubCommitHistory from "@/components/GithubCommitHistory";
import ProjectContainer from "@/components/ProjectContainer";
import { getContentfulProjects } from "@/lib/contentful";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects | Furkan Ünsalan",
  description:
    "Explore a diverse collection of my projects, showcasing my work across various fields. From creative endeavors to technical achievements, each project reflects my skills, dedication, and passion for innovation. Discover the details behind each project and the impact they've made.",
};

export default async function Projects() {
  const projects = await getContentfulProjects();

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="mt-32 mb-12">
          <GithubCommitHistory />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-5/6 md:w-1/2 xl:w-2/3">
          {projects.map((project) => (
            <ProjectContainer key={project.id} project={project} />
          ))}
        </div>
      </div>
    </>
  );
}
