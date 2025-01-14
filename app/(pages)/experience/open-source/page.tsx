import ContributionContainer from "@/components/ContributionContainer";
import { contributions } from "@/data/contributions";
import { Contribution } from "@/types";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open Source | Furkan Ünsalan",
  description:
    "Explore my journey through various open-source contributions and projects.",
};

export default function OpenSource() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen mt-32">
      <div className="w-5/6 md:w-1/3 mx-auto text-left">
        {contributions.map((item: Contribution) => (
          <ContributionContainer key={item.id} contribution={item} />
        ))}
      </div>
    </div>
  );
}
