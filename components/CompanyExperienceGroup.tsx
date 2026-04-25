import { Experience } from "@/types";
import ExperienceContainer from "./ExperienceContainer";

type CompanyGroup = {
  company: string;
  experiences: Experience[];
};

export default function CompanyExperienceGroup({
  group,
}: {
  group: CompanyGroup;
}) {
  const [mostRecent, ...previousRoles] = group.experiences;

  return (
    <div className="mb-8">
      {/* Most recent role - displayed with company name */}
      <div className="mb-4">
        <ExperienceContainer
          work={mostRecent}
          isMainRole={true}
          hasPreviousRoles={previousRoles.length > 0}
        />
      </div>

      {/* Previous roles at the same company - indented */}
      {previousRoles.length > 0 && (
        <div className="pl-4 md:pl-6 border-l-2 border-white/[0.06]">
          {previousRoles.map((role) => (
            <div key={role.id} className="mb-8">
              <ExperienceContainer work={role} isPreviousRole={true} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
