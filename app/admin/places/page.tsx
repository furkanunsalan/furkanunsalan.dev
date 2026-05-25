import Link from "next/link";
import { and, asc, desc, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import { Plus } from "lucide-react";
import PlacesAdminEditor, { type PlaceRow } from "./PlacesAdminEditor";
import RestoreScroll from "@/components/admin/RestoreScroll";
import PlaceListsEditor from "./PlaceListsEditor";

export const dynamic = "force-dynamic";

export default async function AdminPlacesList() {
  const [rows, lists, catRows, listRows, listCounts] = await Promise.all([
    db
      .select({
        slug: schema.places.slug,
        name: schema.places.name,
        city: schema.places.city,
        country: schema.places.country,
        list: schema.places.list,
        category: schema.places.category,
        status: schema.places.status,
        tags: schema.places.tags,
        addedAt: schema.places.addedAt,
        createdAt: schema.places.createdAt,
      })
      .from(schema.places)
      .where(isNull(schema.places.deletedAt))
      .orderBy(desc(schema.places.addedAt)),
    db
      .select({ name: schema.placeLists.name, icon: schema.placeLists.icon })
      .from(schema.placeLists)
      .orderBy(asc(schema.placeLists.position), asc(schema.placeLists.name)),
    db
      .selectDistinct({ category: schema.places.category })
      .from(schema.places)
      .where(
        and(
          sql`${schema.places.category} <> ''`,
          isNull(schema.places.deletedAt),
        ),
      )
      .orderBy(asc(schema.places.category)),
    db
      .select({
        name: schema.placeLists.name,
        icon: schema.placeLists.icon,
        position: schema.placeLists.position,
      })
      .from(schema.placeLists)
      .orderBy(asc(schema.placeLists.position), asc(schema.placeLists.name)),
    db
      .select({ list: schema.places.list, n: sql<number>`count(*)::int` })
      .from(schema.places)
      .where(isNull(schema.places.deletedAt))
      .groupBy(schema.places.list),
  ]);

  const editorRows: PlaceRow[] = rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    city: r.city,
    country: r.country,
    list: r.list,
    category: r.category,
    status: r.status,
    tags: r.tags,
    addedAt: r.addedAt ? r.addedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
  const categories = catRows.map((c) => c.category);

  const byList = new Map<string, number>();
  for (const c of listCounts) byList.set(c.list || "", c.n);
  const placeListsInitial = listRows.map((r) => ({
    ...r,
    placeCount: byList.get(r.name) ?? 0,
  }));

  return (
    <div className="space-y-10">
      <RestoreScroll storageKey="admin:places:scroll" />

      <section>
        <header className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Places</h1>
            <p className="mt-1 text-xs text-light-fourth">
              Manage the lists shown as filter chips on /places, then the
              entries below.
            </p>
          </div>
        </header>
        <PlaceListsEditor initial={placeListsInitial} />
      </section>

      <section>
        <PageHeader
          title="Entries"
          description={`${editorRows.length} places.`}
          action={
            <Link
              href="/admin/places/new"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs bg-accent-primary/15 text-accent-primary ring-1 ring-accent-primary/40 hover:bg-accent-primary/25 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New place
            </Link>
          }
        />
        <PlacesAdminEditor
          rows={editorRows}
          lists={lists}
          categories={categories}
        />
      </section>
    </div>
  );
}
