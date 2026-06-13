import "server-only";
import {
  getCvSettings,
  getExperiences,
  getCustomProjects,
  getHomeSettings,
} from "@/lib/content";
import type { CvDocumentModel, Experience } from "@/types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// getExperiences returns dates as DD/MM/YYYY (en-GB); the CV wants "Mon YYYY".
function monthYear(ddmmyyyy?: string): string {
  if (!ddmmyyyy) return "";
  const [, m, y] = ddmmyyyy.split("/").map(Number);
  if (!m || !y) return "";
  return `${MONTHS[m - 1]} ${y}`;
}
function dateRange(start?: string, end?: string): string {
  const s = monthYear(start);
  const e = end ? monthYear(end) : "Present";
  return s ? `${s} - ${e}` : e;
}
function parseBullets(comment: string): string[] {
  return (comment || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
}
function strip(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^mailto:/, "")
    .replace(/\/$/, "");
}

export async function buildCvModel(
  variant: "short" | "full",
): Promise<CvDocumentModel> {
  const [cv, experiences, projects, home] = await Promise.all([
    getCvSettings(),
    getExperiences(),
    getCustomProjects(),
    getHomeSettings(),
  ]);

  const social = (icon: string) =>
    home.socials.find((s) => s.icon === icon)?.url || "";
  const contact = {
    address: cv.contact.address,
    phone: cv.contact.phone,
    email: strip(social("mail")),
    github: strip(social("github")),
    web: strip(cv.contact.web || "furkanunsalan.dev"),
    linkedin: strip(social("linkedin")),
  };

  // --- experiences: selection (fallback to all), filter by variant, split by kind
  const expBySlug = new Map(experiences.map((e) => [e.slug, e]));
  const expSel = cv.experiences.length
    ? cv.experiences
    : experiences.map((e) => ({ id: e.slug ?? "", inShort: false }));
  const selectedExp = expSel
    .filter((sel) => (variant === "short" ? sel.inShort : true))
    .map((sel) => expBySlug.get(sel.id))
    .filter((e): e is Experience => !!e);

  const toEntry = (e: Experience) => ({
    org: e.organization,
    role: e.title,
    dates: dateRange(e.start_date, e.end_date),
    bullets: parseBullets(e.comment),
  });
  const work = selectedExp.filter((e) => e.kind !== "volunteer").map(toEntry);
  const volunteering =
    variant === "short"
      ? []
      : selectedExp.filter((e) => e.kind === "volunteer").map(toEntry);

  // --- projects: selection (fallback to all custom), reuse table for name/url/description
  const projBySlug = new Map(projects.map((p) => [p.slug, p]));
  const projSel = cv.projects.length
    ? cv.projects
    : projects.map((p) => ({
        slug: p.slug,
        techStack: p.language ?? "",
        inShort: false,
      }));
  const cvProjects = projSel
    .filter((sel) => (variant === "short" ? sel.inShort : true))
    .map((sel) => {
      const p = projBySlug.get(sel.slug);
      if (!p) return null;
      return {
        name: p.name,
        url: p.link ? strip(p.link) : "",
        description: p.description,
        techStack: sel.techStack,
      };
    })
    .filter((p): p is NonNullable<typeof p> => !!p);

  return {
    variant,
    header: cv.header,
    contact,
    summary: cv.summary,
    skills: cv.skills,
    certifications: cv.certifications,
    languages: cv.languages,
    education: cv.education,
    projects: cvProjects,
    work,
    volunteering,
  };
}
