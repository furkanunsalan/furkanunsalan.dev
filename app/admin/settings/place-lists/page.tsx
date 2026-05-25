import { sql, asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import PlaceListsEditor from "./PlaceListsEditor";

export const dynamic = "force-dynamic";

export default async function AdminPlaceListsPage() {
  const [rows, counts] = await Promise.all([
    db
      .select({
        name: schema.placeLists.name,
        icon: schema.placeLists.icon,
        position: schema.placeLists.position,
      })
      .from(schema.placeLists)
      .orderBy(asc(schema.placeLists.position), asc(schema.placeLists.name)),
    // Tally how many places are in each list so the editor can warn before delete.
    db
      .select({ list: schema.places.list, n: sql<number>`count(*)::int` })
      .from(schema.places)
      .groupBy(schema.places.list),
  ]);
  const byName = new Map<string, number>();
  for (const c of counts) byName.set(c.list || "", c.n);

  const initial = rows.map((r) => ({
    ...r,
    placeCount: byName.get(r.name) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Place lists"
        description="Manage the lists shown as filter chips on /places. Deleting a list detaches its members (their list field goes blank)."
      />
      <PlaceListsEditor initial={initial} />
    </div>
  );
}
