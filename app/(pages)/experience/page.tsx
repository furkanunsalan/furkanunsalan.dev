import ExperienceContainer from "@/components/ExperienceContainer";
import { works } from "@/lib/my-work";
import { Work } from "@/types"; // Ensure Work type is correctly imported

export default function Experience() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="w-5/6 md:w-1/3 mx-auto text-left">
        {works.map((item: Work) => (
          <ExperienceContainer key={item.id} work={item} />
        ))}
      </div>
    </div>
  );
}
