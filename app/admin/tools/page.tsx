import { asc, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import { Plus } from "lucide-react";
import Link from "next/link";
import RestoreScroll from "@/components/admin/RestoreScroll";
import ToolsAdminTabs from "./ToolsAdminTabs";

export const dynamic = "force-dynamic";

export default async function AdminToolsList() {
  const rows = await db
    .select()
    .from(schema.tools)
    .where(isNull(schema.tools.deletedAt))
    .orderBy(asc(schema.tools.name));

  return (
    <div>
      <RestoreScroll storageKey="admin:tools:scroll" />
      <PageHeader
        title="Tools"
        description={`${rows.length} entries.`}
        action={
          <Link
            href="/admin/tools/new"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs bg-accent-primary/15 text-accent-primary ring-1 ring-accent-primary/40 hover:bg-accent-primary/25 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New tool
          </Link>
        }
      />
      <ToolsAdminTabs
        rows={rows.map((r) => ({
          name: r.name,
          brand: r.brand,
          what: r.what,
          category: r.category,
          favorite: r.favorite,
        }))}
      />
    </div>
  );
}
