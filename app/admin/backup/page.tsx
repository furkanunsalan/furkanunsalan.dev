import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import { COLLECTION_LIST } from "./lib/collections";
import BackupTools, { type CollectionCount } from "./BackupTools";

export const dynamic = "force-dynamic";

async function loadCounts(): Promise<CollectionCount[]> {
  return Promise.all(
    COLLECTION_LIST.map(async (c) => {
      try {
        const rows = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(c.table);
        return { short: c.short, count: rows[0]?.n ?? 0, pk: c.pk };
      } catch {
        return { short: c.short, count: 0, pk: c.pk };
      }
    }),
  );
}

export default async function AdminBackupPage() {
  const counts = await loadCounts();
  return (
    <div>
      <PageHeader
        title="Backup / Restore"
        description="Export any collection as JSON or CSV. Import JSON with dry-run diff."
      />
      <BackupTools rows={counts} />
    </div>
  );
}
