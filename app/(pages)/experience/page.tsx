import ExperienceContainer from "@/components/ExperienceContainer";
import { Experience } from "@/types";
import { Metadata } from "next";
import { getContentfulExperiences } from "@/lib/contentful";

export const metadata: Metadata = {
  title: "Experience | Furkan Ünsalan",
  description:
    "Explore my journey through diverse work experiences and volunteer initiatives",
};

export default async function Experiences() {
  const works: Experience[] = await getContentfulExperiences();
  return (
    <div className="flex flex-col items-center mt-32 justify-center min-h-screen">
      <div className="w-5/6 md:w-2/3 xl:w-1/3 mx-auto text-left">
        {works.map((item: Experience) => (
          <ExperienceContainer key={item.id} work={item} />
        ))}
      </div>
    </div>
  );
}
