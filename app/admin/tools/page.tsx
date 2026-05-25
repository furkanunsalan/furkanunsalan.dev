import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import { Plus, Wrench, Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminToolsList() {
  const rows = await db
    .select()
    .from(schema.tools)
    .orderBy(asc(schema.tools.name));

  return (
    <div>
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
      <ul className="divide-y divide-white/[0.04] ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950">
        {rows.length === 0 && (
          <li className="px-4 py-6 text-sm text-light-fourth text-center">
            No tools yet.
          </li>
        )}
        {rows.map((t) => (
          <li key={t.name}>
            <Link
              href={`/admin/tools/${encodeURIComponent(t.name)}`}
              className="block px-4 py-3 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-start gap-3">
                <Wrench className="w-4 h-4 text-light-fourth mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">
                    {t.brand}{" "}
                    <span className="text-light-fourth">— {t.what}</span>
                  </div>
                  <div className="text-[10px] text-light-fourth/70 mt-0.5 uppercase tracking-wider">
                    {t.category}
                  </div>
                </div>
                {t.favorite && (
                  <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
