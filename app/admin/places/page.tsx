import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import { Plus, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<string, string> = {
  "want-to-go":
    "bg-accent-primary/15 text-accent-primary ring-accent-primary/30",
  been: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  favorite: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
};

export default async function AdminPlacesList() {
  const rows = await db
    .select()
    .from(schema.places)
    .orderBy(desc(schema.places.addedAt));

  return (
    <div>
      <PageHeader
        title="Places"
        description={`${rows.length} entries. Sorted by save date.`}
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

      <ul className="divide-y divide-white/[0.04] ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950">
        {rows.length === 0 && (
          <li className="px-4 py-6 text-sm text-light-fourth text-center">
            No places yet.
          </li>
        )}
        {rows.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/admin/places/${encodeURIComponent(p.slug)}`}
              className="block px-4 py-3 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-light-fourth mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{p.name}</div>
                  <div className="text-xs text-light-fourth truncate">
                    {[p.city, p.country].filter(Boolean).join(" · ") || "—"}
                  </div>
                  {p.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.tags.slice(0, 6).map((t) => (
                        <span
                          key={t}
                          className="rounded-full px-2 py-0.5 text-[10px] ring-1 ring-white/[0.06] text-light-fourth"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 shrink-0 ${
                    STATUS_CHIP[p.status] || ""
                  }`}
                >
                  {p.status.replace("-", " ")}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
