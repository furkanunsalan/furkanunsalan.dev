import { notFound } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import PlaceForm from "../PlaceForm";
import { PageHeader } from "@/components/admin/form";

export const dynamic = "force-dynamic";

export default async function EditPlacePage({
  params,
}: {
  params: { slug: string };
}) {
  const [[row], lists, catRows] = await Promise.all([
    db
      .select()
      .from(schema.places)
      .where(eq(schema.places.slug, params.slug))
      .limit(1),
    db
      .select({ name: schema.placeLists.name, icon: schema.placeLists.icon })
      .from(schema.placeLists)
      .orderBy(asc(schema.placeLists.position), asc(schema.placeLists.name)),
    db
      .selectDistinct({ category: schema.places.category })
      .from(schema.places)
      .where(sql`${schema.places.category} <> ''`)
      .orderBy(asc(schema.places.category)),
  ]);
  if (!row) notFound();
  const categories = catRows.map((r) => r.category);

  return (
    <div>
      <PageHeader
        title={row.name}
        description={`/places — ${row.slug}`}
        back={{ href: "/admin/places" }}
      />
      <PlaceForm
        mode="edit"
        lists={lists}
        categories={categories}
        initial={{
          slug: row.slug,
          name: row.name,
          lat: row.lat,
          lng: row.lng,
          address: row.address,
          list: row.list,
          category: row.category,
          city: row.city,
          country: row.country,
          status: row.status,
          sourceUrl: row.sourceUrl || "",
          notes: row.notes,
          tags: row.tags,
          addedAt: row.addedAt ? row.addedAt.toISOString() : "",
        }}
      />
    </div>
  );
}
