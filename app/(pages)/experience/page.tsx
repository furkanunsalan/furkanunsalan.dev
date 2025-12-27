import CompanyExperienceGroup from "@/components/CompanyExperienceGroup";
import ExperienceContainer from "@/components/ExperienceContainer";
import { Experience } from "@/types";
import { Metadata } from "next";
import { getContentfulExperiences } from "@/lib/contentful";

export const metadata: Metadata = {
  title: "Experience | Furkan Ünsalan",
  description:
    "Explore my journey through diverse work experiences and volunteer initiatives",
};

// Helper function to parse date for sorting
const parseDate = (dateStr: string): Date => {
  // Handle "Current" or empty end_date
  if (!dateStr || dateStr === "Current" || dateStr.trim() === "") {
    return new Date(); // Use current date for sorting (most recent)
  }
  // Parse date in "DD/MM/YYYY" format (en-GB locale)
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  // Fallback to current date if parsing fails
  return new Date();
};

// Group experiences by company
const groupExperiencesByCompany = (
  experiences: Experience[],
): Array<{ company: string; experiences: Experience[] }> => {
  const grouped = new Map<string, Experience[]>();

  experiences.forEach((exp) => {
    const company = exp.organization;
    if (!grouped.has(company)) {
      grouped.set(company, []);
    }
    grouped.get(company)!.push(exp);
  });

  // Sort experiences within each company by date (most recent first)
  // Use end_date if available, otherwise use start_date
  grouped.forEach((exps) => {
    exps.sort((a, b) => {
      const dateA = parseDate(a.end_date || a.start_date);
      const dateB = parseDate(b.end_date || b.start_date);
      return dateB.getTime() - dateA.getTime();
    });
  });

  // Convert to array and sort companies by most recent experience date
  const result = Array.from(grouped.entries()).map(([company, exps]) => ({
    company,
    experiences: exps,
  }));

  // Sort company groups by most recent experience date
  result.sort((a, b) => {
    // Get the most recent experience from each company (already sorted)
    const mostRecentA = a.experiences[0];
    const mostRecentB = b.experiences[0];
    const dateA = parseDate(mostRecentA.end_date || mostRecentA.start_date);
    const dateB = parseDate(mostRecentB.end_date || mostRecentB.start_date);
    return dateB.getTime() - dateA.getTime();
  });

  return result;
};

export default async function Experiences() {
  const works: Experience[] = await getContentfulExperiences();
  const groupedExperiences = groupExperiencesByCompany(works);

  return (
    <div className="flex flex-col items-center mt-32 justify-center min-h-screen">
      <div className="w-5/6 md:w-2/3 xl:w-1/3 mx-auto text-left">
        {groupedExperiences.map((group) => {
          // If only one experience for this company, display normally
          if (group.experiences.length === 1) {
            return (
              <ExperienceContainer
                key={group.experiences[0].id}
                work={group.experiences[0]}
              />
            );
          }
          // If multiple experiences, use the grouped component
          return <CompanyExperienceGroup key={group.company} group={group} />;
        })}
      </div>
    </div>
  );
}
