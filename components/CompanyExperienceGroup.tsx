import { Experience } from "@/types";
import Image from "next/image";
import ExperienceContainer from "./ExperienceContainer";

type CompanyGroup = {
  company: string;
  experiences: Experience[];
};

const parseDDMMYYYY = (s?: string): Date | null => {
  if (!s) return null;
  const [d, m, y] = s.split("/").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
};

const formatMonths = (months: number): string => {
  const total = Math.max(months, 1);
  const years = Math.floor(total / 12);
  const rem = total % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
  if (rem > 0) parts.push(`${rem} mo${rem > 1 ? "s" : ""}`);
  return parts.join(" ");
};

// Inclusive month count, matching how résumés count tenure (Jan–Sep = 9 mos).
const monthsBetween = (start: Date, end: Date): number =>
  (end.getFullYear() - start.getFullYear()) * 12 +
  (end.getMonth() - start.getMonth()) +
  1;

const roleDuration = (exp: Experience): string => {
  const start = parseDDMMYYYY(exp.start_date);
  if (!start) return "";
  const end = parseDDMMYYYY(exp.end_date) ?? new Date();
  return formatMonths(monthsBetween(start, end));
};

// Total tenure across all roles: earliest start to the latest end (or now if
// any role is ongoing).
const companyDuration = (experiences: Experience[]): string => {
  const starts = experiences
    .map((e) => parseDDMMYYYY(e.start_date))
    .filter((d): d is Date => !!d);
  if (starts.length === 0) return "";
  const earliest = new Date(Math.min(...starts.map((d) => d.getTime())));
  const ends = experiences
    .map((e) => parseDDMMYYYY(e.end_date))
    .filter((d): d is Date => !!d);
  const latest = experiences.some((e) => !e.end_date)
    ? new Date()
    : new Date(Math.max(...ends.map((d) => d.getTime())));
  return formatMonths(monthsBetween(earliest, latest));
};

export default function CompanyExperienceGroup({
  group,
}: {
  group: CompanyGroup;
}) {
  // The most recent role carrying a logo stands in for the whole company
  // (experiences are sorted most-recent-first). No logo on any role → none.
  const logo = group.experiences.find((e) => e.logo)?.logo;
  const totalDuration = companyDuration(group.experiences);

  // Align the rail under the logo's centre when one exists, otherwise keep a
  // tighter indent against the company name. Desktop only — mobile drops the
  // rail entirely and lets roles use the full width.
  const rail = logo
    ? { indent: "md:ml-[21px] md:pl-[33px]", line: "-left-[33px]", dot: "-left-[37px]" }
    : { indent: "md:ml-[3px] md:pl-[27px]", line: "-left-[27px]", dot: "-left-[31px]" };

  return (
    <div className="mb-8 border-b border-white/[0.06] pb-8 md:border-b-0 md:pb-0">
      {/* Company is the primary focus — logo above the name on mobile */}
      <div className="flex flex-col md:flex-row items-start gap-3">
        {logo && (
          <div className="relative mt-0.5 shrink-0 w-11 h-11 overflow-hidden rounded-lg bg-white/[0.04]">
            <Image
              src={logo}
              alt={`${group.company} logo`}
              fill
              sizes="44px"
              className="object-cover"
            />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white">{group.company}</h3>
          {totalDuration && (
            <p className="text-sm text-light-fourth mt-0.5">{totalDuration}</p>
          )}
        </div>
      </div>

      {/* Roles sit on one vertical rail, each marked with a dot. The connector
          runs dot-to-dot, so it never pokes above the first or below the last. */}
      <div className={`mt-4 space-y-6 ${rail.indent}`}>
        {group.experiences.map((role, i) => (
          <div key={role.id} className="relative">
            {i < group.experiences.length - 1 && (
              <span
                className={`hidden md:block absolute top-[11px] h-[calc(100%_+_1.5rem)] w-0.5 bg-white/[0.12] ${rail.line}`}
              />
            )}
            <span
              className={`hidden md:block absolute top-1.5 h-2.5 w-2.5 rounded-full bg-zinc-500 ${rail.dot}`}
            />
            <ExperienceContainer
              work={role}
              isPreviousRole
              durationLabel={roleDuration(role)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
