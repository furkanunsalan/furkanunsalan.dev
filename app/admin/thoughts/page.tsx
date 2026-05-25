import Link from "next/link";
import { desc, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import { Plus, MessageSquare, ImageIcon } from "lucide-react";
import RestoreScroll from "@/components/admin/RestoreScroll";

export const dynamic = "force-dynamic";

function truncate(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, n).trimEnd() + "…";
}

export default async function AdminThoughtsList() {
  const rows = await db
    .select()
    .from(schema.thoughts)
    .where(isNull(schema.thoughts.deletedAt))
    .orderBy(desc(schema.thoughts.createdAt));

  return (
    <div>
      <RestoreScroll storageKey="admin:thoughts:scroll" />
      <PageHeader
        title="Thoughts"
        description={`${rows.length} entries.`}
        action={
          <Link
            href="/admin/thoughts/new"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs bg-accent-primary/15 text-accent-primary ring-1 ring-accent-primary/40 hover:bg-accent-primary/25 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New thought
          </Link>
        }
      />

      <ul className="divide-y divide-white/[0.04] ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950">
        {rows.length === 0 && (
          <li className="px-4 py-6 text-sm text-light-fourth text-center">
            No thoughts yet.
          </li>
        )}
        {rows.map((t) => {
          const imageCount = (t.images || []).length;
          const preview = truncate(t.body || "", 140) || "(no body)";
          return (
            <li key={t.id}>
              <Link
                href={`/admin/thoughts/${t.id}`}
                className="block px-4 py-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-light-fourth shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate flex items-center gap-2">
                      <span className="truncate">{preview}</span>
                      {t.draft && (
                        <span className="shrink-0 inline-flex items-center rounded-full px-2 py-[3px] text-[10px] leading-none uppercase tracking-wider ring-1 ring-amber-400/40 bg-amber-400/10 text-amber-300">
                          draft
                        </span>
                      )}
                    </div>
                    {t.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {t.tags.slice(0, 6).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full px-2 py-0.5 text-[10px] ring-1 ring-white/[0.06] text-light-fourth"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2 text-light-fourth">
                    {imageCount > 0 && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px]"
                        title={`${imageCount} image${imageCount === 1 ? "" : "s"}`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span className="tabular-nums">{imageCount}</span>
                      </span>
                    )}
                    <time className="text-xs tabular-nums">
                      {t.createdAt.toISOString().slice(0, 10)}
                    </time>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
