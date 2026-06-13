import { eq, isNull, asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import CvForm from "./CvForm";

export const dynamic = "force-dynamic";

export default async function AdminCv() {
  const [row] = await db
    .select()
    .from(schema.cvSettings)
    .where(eq(schema.cvSettings.id, 1))
    .limit(1);

  const availableExperiences = await db
    .select({
      id: schema.experiences.id,
      organization: schema.experiences.organization,
      title: schema.experiences.title,
      kind: schema.experiences.kind,
    })
    .from(schema.experiences)
    .where(isNull(schema.experiences.deletedAt))
    .orderBy(asc(schema.experiences.order));

  const availableProjects = await db
    .select({ slug: schema.projects.slug, name: schema.projects.name })
    .from(schema.projects)
    .where(isNull(schema.projects.deletedAt))
    .orderBy(asc(schema.projects.order));

  return (
    <div>
      <PageHeader
        title="CV / Resume"
        description="Drives /resume and the PDF download. Work Experience + Projects reuse the experiences/projects tables; an experience's kind (work/volunteer) decides its CV section."
      />
      <CvForm
        initial={{
          header: row?.header ?? { name: "", role: "" },
          contact: row?.contact ?? { address: "", phone: "", web: "" },
          summary: row?.summary ?? "",
          skills: row?.skills ?? [],
          certifications: row?.certifications ?? [],
          languages: row?.languages ?? [],
          education: row?.education ?? [],
          projects: row?.projects ?? [],
          experiences: row?.experiences ?? [],
        }}
        availableExperiences={availableExperiences}
        availableProjects={availableProjects}
      />
    </div>
  );
}
