import type { ProjectCardData } from "@/types";
import ProjectContainer from "@/components/ProjectContainer";

export default function ProjectsExplorer({
  cards,
}: {
  cards: ProjectCardData[];
}) {
  return (
    <ul className="stagger divide-y divide-white/[0.06] border-y border-white/[0.06]">
      {cards.map((card) => (
        <ProjectContainer key={card.slug} project={card} />
      ))}
    </ul>
  );
}
