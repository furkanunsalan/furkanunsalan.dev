import Link from "next/link";
import { asc, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import { Plus, FolderGit2 } from "lucide-react";
import RestoreScroll from "@/components/admin/RestoreScroll";
import GithubVisibilityEditor from "./GithubVisibilityEditor";

export const dynamic = "force-dynamic";

export default async function AdminProjectsList() {
  const [rows, ghRows] = await Promise.all([
    db
      .select()
      .from(schema.projects)
      .where(isNull(schema.projects.deletedAt))
      .orderBy(asc(schema.projects.order)),
    db
      .select()
      .from(schema.githubProjectVisibility)
      .orderBy(
        asc(schema.githubProjectVisibility.pinOrder),
        asc(schema.githubProjectVisibility.name),
      ),
  ]);

  return (
    <div className="space-y-10">
      <RestoreScroll storageKey="admin:projects:scroll" />

      <section>
        <PageHeader
          title="Projects"
          description={`${rows.length} custom entries. Sorted by order field.`}
          action={
            <Link
              href="/admin/projects/new"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs bg-accent-primary/15 text-accent-primary ring-1 ring-accent-primary/40 hover:bg-accent-primary/25 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New project
            </Link>
          }
        />
        <ul className="divide-y divide-white/[0.04] ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950">
          {rows.length === 0 && (
            <li className="px-4 py-6 text-sm text-light-fourth text-center">
              No custom projects yet.
            </li>
          )}
          {rows.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/admin/projects/${encodeURIComponent(p.slug)}`}
                className="block px-4 py-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FolderGit2 className="w-4 h-4 text-light-fourth shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate">{p.name}</div>
                    <div className="text-xs text-light-fourth truncate">
                      {p.description || "—"}
                    </div>
                    <div className="text-[10px] text-light-fourth/70 mt-1 uppercase tracking-wider">
                      order {p.order}
                      {p.language ? ` · ${p.language}` : ""}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="github" className="scroll-mt-16">
        <header className="mb-4">
          <h2 className="text-base font-semibold tracking-tight">
            GitHub repos
          </h2>
          <p className="mt-1 text-xs text-light-fourth">
            Which repos appear on /projects, and which are pinned to the top.
            Sync re-imports the live repo list while preserving your toggles.
          </p>
        </header>
        <GithubVisibilityEditor initial={ghRows} />
      </section>
    </div>
  );
}
