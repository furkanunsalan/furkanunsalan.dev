import { desc, and, eq, SQL } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import RestoreScroll from "@/components/admin/RestoreScroll";
import ActivityRow from "./ActivityRow";
import ActivityFilters from "./ActivityFilters";

export const dynamic = "force-dynamic";

const LIMIT = 200;

const ACTIONS = [
  "create",
  "update",
  "delete",
  "restore",
  "purge",
  "bulk-delete",
] as const;

const RESOURCES = [
  "post",
  "thought",
  "place",
  "project",
  "experience",
  "tool",
  "placeList",
  "home",
  "github",
] as const;

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams?: { resource?: string; action?: string };
}) {
  const resourceFilter =
    searchParams?.resource && RESOURCES.includes(searchParams.resource as never)
      ? searchParams.resource
      : "";
  const actionFilter =
    searchParams?.action && ACTIONS.includes(searchParams.action as never)
      ? searchParams.action
      : "";

  const wheres: SQL[] = [];
  if (resourceFilter)
    wheres.push(eq(schema.auditEvents.resource, resourceFilter));
  if (actionFilter) wheres.push(eq(schema.auditEvents.action, actionFilter));
  const whereClause =
    wheres.length === 0
      ? undefined
      : wheres.length === 1
        ? wheres[0]
        : and(...wheres);

  const rows = await db
    .select()
    .from(schema.auditEvents)
    .where(whereClause)
    .orderBy(desc(schema.auditEvents.at))
    .limit(LIMIT);

  return (
    <div>
      <PageHeader
        title="Activity"
        description="Append-only log of every admin mutation. Auto-truncated to last 200 events."
      />

      <ActivityFilters
        action={actionFilter}
        resource={resourceFilter}
        actions={[...ACTIONS]}
        resources={[...RESOURCES]}
      />

      <ul className="mt-4 divide-y divide-white/[0.04] ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950">
        {rows.length === 0 && (
          <li className="px-4 py-8 text-sm text-light-fourth text-center">
            No events match.
          </li>
        )}
        {rows.map((r) => (
          <ActivityRow
            key={r.id}
            id={r.id}
            at={r.at.toISOString()}
            action={r.action}
            resource={r.resource}
            rowId={r.rowId}
            ip={r.ip}
            before={r.before ?? null}
            after={r.after ?? null}
          />
        ))}
      </ul>

      <RestoreScroll storageKey="admin:activity:scroll" />
    </div>
  );
}
