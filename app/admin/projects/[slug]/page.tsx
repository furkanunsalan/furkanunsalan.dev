import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import ProjectForm from "../ProjectForm";
import { PageHeader } from "@/components/admin/form";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: { slug: string };
}) {
  const [row] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.slug, params.slug))
    .limit(1);
  if (!row) notFound();
  return (
    <div>
      <PageHeader title={row.name} description={`/projects/${row.slug}`} />
      <ProjectForm
        mode="edit"
        initial={{
          slug: row.slug,
          name: row.name,
          description: row.description,
          metric: row.metric,
          link: row.link,
          language: row.language || "",
          order: row.order,
          image: row.image || undefined,
          content: row.content,
        }}
      />
    </div>
  );
}
