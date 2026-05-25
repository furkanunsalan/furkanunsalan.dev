import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import NewPlaceClient from "./NewPlaceClient";

export const dynamic = "force-dynamic";

export default async function NewPlacePage() {
  const lists = await db
    .select({ name: schema.placeLists.name, icon: schema.placeLists.icon })
    .from(schema.placeLists)
    .orderBy(asc(schema.placeLists.position), asc(schema.placeLists.name));
  return (
    <div>
      <PageHeader title="New place" />
      <NewPlaceClient lists={lists} />
    </div>
  );
}
