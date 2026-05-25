import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import NewPlaceClient from "./NewPlaceClient";

export const dynamic = "force-dynamic";

export default async function NewPlacePage() {
  const [lists, catRows] = await Promise.all([
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
  const categories = catRows.map((r) => r.category);
  return (
    <div>
      <PageHeader title="New place" back={{ href: "/admin/places" }} />
      <NewPlaceClient lists={lists} categories={categories} />
    </div>
  );
}
