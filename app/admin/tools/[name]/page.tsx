import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import ToolForm from "../ToolForm";
import { PageHeader } from "@/components/admin/form";
import { slugifyAscii } from "@/lib/slugify";

export const dynamic = "force-dynamic";

export default async function EditToolPage({
  params,
}: {
  params: { name: string };
}) {
  let [row] = await db
    .select()
    .from(schema.tools)
    .where(eq(schema.tools.name, params.name))
    .limit(1);

  // Legacy rows have raw names with quote/space/non-ascii chars that don't
  // survive URL round-tripping cleanly. The list page links via slugifyAscii;
  // fall back to a slug-equality scan so those rows still resolve.
  if (!row) {
    const all = await db.select().from(schema.tools);
    row =
      all.find((r) => slugifyAscii(r.name) === params.name) ||
      all.find((r) => slugifyAscii(r.name) === slugifyAscii(params.name)) ||
      (undefined as never);
  }
  if (!row) notFound();

  return (
    <div>
      <PageHeader
        title={`${row.brand} ${row.what}`}
        description={row.name}
        back={{ href: "/admin/tools" }}
      />
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
          icon: row.icon || "",
        }}
      />
    </div>
  );
}
