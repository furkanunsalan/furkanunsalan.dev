import Link from "next/link";
import { desc, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import { Plus, PenLine } from "lucide-react";
import RestoreScroll from "@/components/admin/RestoreScroll";

export const dynamic = "force-dynamic";

export default async function AdminPostsList() {
  const rows = await db
    .select()
    .from(schema.posts)
    .where(isNull(schema.posts.deletedAt))
    .orderBy(desc(schema.posts.date));

  return (
    <div>
      <RestoreScroll storageKey="admin:posts:scroll" />
      <PageHeader
        title="Posts"
        description={`${rows.length} entries.`}
        action={
          <Link
            href="/admin/posts/new"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs bg-accent-primary/15 text-accent-primary ring-1 ring-accent-primary/40 hover:bg-accent-primary/25 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New post
          </Link>
        }
      />

      <ul className="divide-y divide-white/[0.04] ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950">
        {rows.length === 0 && (
          <li className="px-4 py-6 text-sm text-light-fourth text-center">
            No posts yet.
          </li>
        )}
        {rows.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/admin/posts/${encodeURIComponent(p.slug)}`}
              className="block px-4 py-3 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3">
                <PenLine className="w-4 h-4 text-light-fourth shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate flex items-center gap-2">
                    <span className="truncate">{p.title}</span>
                    {p.draft && (
                      <span className="shrink-0 inline-flex items-center rounded-full px-2 py-[3px] text-[10px] leading-none uppercase tracking-wider ring-1 ring-amber-400/40 bg-amber-400/10 text-amber-300">
                        draft
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-light-fourth truncate">
                    {p.slug}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1 max-w-[55%]">
                  <time className="text-xs text-light-fourth tabular-nums">
                    {String(p.date)}
                  </time>
                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-1">
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
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
