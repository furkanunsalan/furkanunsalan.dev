import ExperienceContainer from "@/components/ExperienceContainer";
import { works } from "@/data/experiences";
import { Work } from "@/types";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open Source | Furkan Ünsalan",
  description:
    "Explore my journey through diverse work experiences and volunteer initiatives",
};

export default function Experience() {
  return (
    <div className="flex flex-col items-center mt-32 justify-center min-h-screen">
      <div className="w-5/6 md:w-1/3 mx-auto text-left">
        {works.map((item: Work) => (
          <ExperienceContainer key={item.id} work={item} />
        ))}
      </div>
    </div>
  );
}
