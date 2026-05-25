import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import ToolForm from "../ToolForm";
import { PageHeader } from "@/components/admin/form";

export const dynamic = "force-dynamic";

export default async function EditToolPage({
  params,
}: {
  params: { name: string };
}) {
  const [row] = await db
    .select()
    .from(schema.tools)
    .where(eq(schema.tools.name, params.name))
    .limit(1);
  if (!row) notFound();
  return (
    <div>
      <PageHeader title={`${row.brand} ${row.what}`} description={row.name} />
      <ToolForm
        mode="edit"
        initial={{
          name: row.name,
          brand: row.brand,
          what: row.what,
          category: row.category,
          comment: row.comment,
          favorite: row.favorite,
          link: row.link || "",
        }}
      />
    </div>
  );
}
