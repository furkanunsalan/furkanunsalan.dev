import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import { Plus, Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminExperiencesList() {
  const rows = await db
    .select()
    .from(schema.experiences)
    .orderBy(asc(schema.experiences.order));

  return (
    <div>
      <PageHeader
        title="Experiences"
        description={`${rows.length} entries. Sorted by order field.`}
        action={
          <Link
            href="/admin/experiences/new"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs bg-accent-primary/15 text-accent-primary ring-1 ring-accent-primary/40 hover:bg-accent-primary/25 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New entry
          </Link>
        }
      />
      <ul className="divide-y divide-white/[0.04] ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950">
        {rows.length === 0 && (
          <li className="px-4 py-6 text-sm text-light-fourth text-center">
            No experiences yet.
          </li>
        )}
        {rows.map((e) => (
          <li key={e.id}>
            <Link
              href={`/admin/experiences/${encodeURIComponent(e.id)}`}
              className="block px-4 py-3 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-start gap-3">
                <Briefcase className="w-4 h-4 text-light-fourth mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">
                    {e.title}{" "}
                    <span className="text-light-fourth">
                      @ {e.organization}
                    </span>
                  </div>
                  <div className="text-xs text-light-fourth truncate">
                    {String(e.startDate)} →{" "}
                    {e.endDate ? String(e.endDate) : "current"}
                  </div>
                </div>
                <span className="text-[10px] text-light-fourth/70 shrink-0 uppercase tracking-wider">
                  order {e.order}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
