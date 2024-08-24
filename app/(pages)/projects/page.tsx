import GithubCommitHistory from "@/components/GithubCommitHistory";
import ProjectContainer from "@/components/ProjectContainer";
import { projects } from "@/lib/my-projects";

export default function Projects() {
  return (
    <>
      <div className="flex flex-col items-center justify-center h-screen">
        <GithubCommitHistory />
        {projects.map((project) => (
          <ProjectContainer key={project.id} project={project} />
        ))}
      </div>
    </>
  );
}
