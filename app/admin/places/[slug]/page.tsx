import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import PlaceForm from "../PlaceForm";
import { PageHeader } from "@/components/admin/form";

export const dynamic = "force-dynamic";

export default async function EditPlacePage({
  params,
}: {
  params: { slug: string };
}) {
  const [[row], lists] = await Promise.all([
    db
      .select()
      .from(schema.places)
      .where(eq(schema.places.slug, params.slug))
      .limit(1),
    db
      .select({ name: schema.placeLists.name, icon: schema.placeLists.icon })
      .from(schema.placeLists)
      .orderBy(asc(schema.placeLists.position), asc(schema.placeLists.name)),
  ]);
  if (!row) notFound();

  return (
    <div>
      <PageHeader title={row.name} description={`/places — ${row.slug}`} />
      <PlaceForm
        mode="edit"
        lists={lists}
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
