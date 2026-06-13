import type { ProjectCardData } from "@/types";
import ProjectContainer from "@/components/ProjectContainer";

export default function ProjectsExplorer({
  cards,
}: {
  cards: ProjectCardData[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 stagger">
      {cards.map((card) => (
        <ProjectContainer key={card.slug} project={card} />
      ))}
    </div>
  );
}
