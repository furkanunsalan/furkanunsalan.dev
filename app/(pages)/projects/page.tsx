import GithubCommitHistory from "@/components/GithubCommitHistory";
import ProjectContainer from "@/components/ProjectContainer";
import { projects } from "@/lib/my-projects";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects | Furkan Ünsalan",
  description:
    "Explore a diverse collection of my projects, showcasing my work across various fields. From creative endeavors to technical achievements, each project reflects my skills, dedication, and passion for innovation. Discover the details behind each project and the impact they've made.",
};

export default function Projects() {
  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="mt-32 mb-12">
          <GithubCommitHistory />
        </div>
        {projects
          .sort((a, b) => {
            const dateA = new Date(a.update).getTime();
            const dateB = new Date(b.update).getTime();
            return dateB - dateA; // Reverse the order to put the newest on top
          })
          .map((project) => (
            <ProjectContainer key={project.id} project={project} />
          ))}
      </div>
    </>
  );
}
