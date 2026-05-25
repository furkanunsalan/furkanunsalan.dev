import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import ExperienceForm from "../ExperienceForm";
import { PageHeader } from "@/components/admin/form";

export const dynamic = "force-dynamic";

export default async function EditExperiencePage({
  params,
}: {
  params: { id: string };
}) {
  const [row] = await db
    .select()
    .from(schema.experiences)
    .where(eq(schema.experiences.id, params.id))
    .limit(1);
  if (!row) notFound();
  return (
    <div>
      <PageHeader
        title={`${row.title} @ ${row.organization}`}
        description={row.id}
        back={{ href: "/admin/experiences" }}
      />
      <ExperienceForm
        mode="edit"
        initial={{
          id: row.id,
          order: row.order,
          organization: row.organization,
          title: row.title,
          startDate: String(row.startDate),
          endDate: row.endDate ? String(row.endDate) : "",
          comment: row.comment,
          links: row.links,
          images: row.images,
        }}
      />
    </div>
  );
}
