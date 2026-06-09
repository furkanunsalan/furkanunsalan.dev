import Link from "next/link";
import { desc, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  PenLine,
  MessageSquare,
  FolderGit2,
  Briefcase,
  Wrench,
  MapPin,
  Settings,
  ArrowUpRight,
  Plus,
  Check,
  X,
} from "lucide-react";
import Sparkline from "@/components/admin/Sparkline";
import UploadsSweepCard from "@/components/admin/UploadsSweepCard";
import { runHealthChecks, type CheckResult } from "@/lib/health";

export const dynamic = "force-dynamic";

const ACTIVITY_DAYS = 30;

type DayBucket = { d: string; n: number };

function bucketize(rows: DayBucket[], days: number): number[] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.d, r.n);
  const out: number[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push(map.get(key) ?? 0);
  }
  return out;
}

async function activityByDay(table: string, col: string): Promise<number[]> {
  // No drizzle helper covers this cleanly across tables — keep it as a small
  // ad-hoc query. table/col come from a fixed allowlist, never user input.
  const rows = await db.execute<{ d: string; n: number }>(sql`
    select to_char(date_trunc('day', ${sql.raw(col)})::date, 'YYYY-MM-DD') as d,
           count(*)::int as n
    from ${sql.raw(table)}
    where ${sql.raw(col)} >= now() - interval '${sql.raw(String(ACTIVITY_DAYS))} days'
    group by 1
    order by 1
  `);
  return bucketize(rows as unknown as DayBucket[], ACTIVITY_DAYS);
}

async function countAll() {
  const [
    posts,
    thoughts,
    projects,
    experiences,
    tools,
    places,
    placeLists,
    github,
    logins,
    recentLogins,
    actPosts,
    actThoughts,
    actProjects,
    actExperiences,
    actTools,
    actPlaces,
    actGithub,
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.posts),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.thoughts),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.projects),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.experiences),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.tools),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.places),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.placeLists),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.githubProjectVisibility),
    db
      .select({
        ok: sql<number>`count(*) filter (where ok) ::int`,
        fail: sql<number>`count(*) filter (where not ok) ::int`,
      })
      .from(schema.adminLogins)
      .where(sql`at > now() - interval '24 hours'`),
    db
      .select()
      .from(schema.adminLogins)
      .orderBy(desc(schema.adminLogins.at))
      .limit(5),
    activityByDay("posts", "created_at"),
    activityByDay("thoughts", "created_at"),
    activityByDay("projects", "created_at"),
    activityByDay("experiences", "created_at"),
    activityByDay("tools", "created_at"),
    activityByDay("places", "created_at"),
    activityByDay("github_project_visibility", "updated_at"),
  ]);
  return {
    posts: posts[0]?.n ?? 0,
    thoughts: thoughts[0]?.n ?? 0,
    projects: projects[0]?.n ?? 0,
    experiences: experiences[0]?.n ?? 0,
    tools: tools[0]?.n ?? 0,
    places: places[0]?.n ?? 0,
    placeLists: placeLists[0]?.n ?? 0,
    github: github[0]?.n ?? 0,
    logins: logins[0] ?? { ok: 0, fail: 0 },
    recentLogins: recentLogins.map((r) => ({
      id: r.id,
      at: r.at.toISOString(),
      ip: r.ip,
      ok: r.ok,
    })),
    activity: {
      posts: actPosts,
      thoughts: actThoughts,
      projects: actProjects,
      experiences: actExperiences,
      tools: actTools,
      places: actPlaces,
      github: actGithub,
    },
  };
}

// Latest posts + thoughts interleaved into one stream, each linking to its
// own admin editor. This is the dashboard's merged "writing" surface.
type RecentWritingItem =
  | {
      kind: "post";
      key: string;
      href: string;
      title: string;
      date: string;
      draft: boolean;
    }
  | {
      kind: "thought";
      key: string;
      href: string;
      title: string;
      date: string;
      draft: boolean;
    };

function thoughtPreview(body: string, imageCount: number): string {
  const t = (body || "").replace(/\s+/g, " ").trim();
  if (t) return t.length > 80 ? t.slice(0, 79).trimEnd() + "…" : t;
  return imageCount > 0
    ? `${imageCount} image${imageCount === 1 ? "" : "s"}`
    : "(empty)";
}

async function recentWriting(limit = 8): Promise<RecentWritingItem[]> {
  try {
    const [postRows, thoughtRows] = await Promise.all([
      db
        .select({
          slug: schema.posts.slug,
          title: schema.posts.title,
          date: schema.posts.date,
          draft: schema.posts.draft,
        })
        .from(schema.posts)
        .where(isNull(schema.posts.deletedAt))
        .orderBy(desc(schema.posts.date))
        .limit(limit),
      db
        .select({
          id: schema.thoughts.id,
          body: schema.thoughts.body,
          images: schema.thoughts.images,
          draft: schema.thoughts.draft,
          createdAt: schema.thoughts.createdAt,
        })
        .from(schema.thoughts)
        .where(isNull(schema.thoughts.deletedAt))
        .orderBy(desc(schema.thoughts.createdAt))
        .limit(limit),
    ]);

    const items: RecentWritingItem[] = [
      ...postRows.map(
        (p): RecentWritingItem => ({
          kind: "post",
          key: `p-${p.slug}`,
          href: `/admin/posts/${encodeURIComponent(p.slug)}`,
          title: p.title,
          date: String(p.date),
          draft: p.draft,
        }),
      ),
      ...thoughtRows.map(
        (t): RecentWritingItem => ({
          kind: "thought",
          key: `t-${t.id}`,
          href: `/admin/thoughts/${t.id}`,
          title: thoughtPreview(t.body, (t.images || []).length),
          date: t.createdAt.toISOString(),
          draft: t.draft,
        }),
      ),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return items.slice(0, limit);
  } catch (e) {
    console.error("[recentWriting] query failed:", e);
    return [];
  }
}

function zipSum(a: number[], b: number[]): number[] {
  const len = Math.max(a.length, b.length);
  const out: number[] = [];
  for (let i = 0; i < len; i++) out.push((a[i] ?? 0) + (b[i] ?? 0));
  return out;
}

type Counts = Awaited<ReturnType<typeof countAll>>;

type Tile = {
  label: string;
  href: string;
  Icon: typeof PenLine;
  count: (c: Counts) => number;
  secondary?: (c: Counts) => string | null;
  series: (c: Counts) => number[];
};

const TILES: Tile[] = [
  {
    label: "Writing",
    href: "/admin/posts",
    Icon: PenLine,
    count: (c) => c.posts + c.thoughts,
    secondary: (c) =>
      `${c.posts} essay${c.posts === 1 ? "" : "s"} · ${c.thoughts} thought${c.thoughts === 1 ? "" : "s"}`,
    series: (c) => zipSum(c.activity.posts, c.activity.thoughts),
  },
  {
    label: "Projects",
    href: "/admin/projects",
    Icon: FolderGit2,
    count: (c) => c.projects + c.github,
    secondary: (c) => `${c.projects} custom · ${c.github} repos`,
    series: (c) => zipSum(c.activity.projects, c.activity.github),
  },
  {
    label: "Experiences",
    href: "/admin/experiences",
    Icon: Briefcase,
    count: (c) => c.experiences,
    series: (c) => c.activity.experiences,
  },
  {
    label: "Tools",
    href: "/admin/tools",
    Icon: Wrench,
    count: (c) => c.tools,
    series: (c) => c.activity.tools,
  },
  {
    label: "Places",
    href: "/admin/places",
    Icon: MapPin,
    count: (c) => c.places,
    secondary: (c) => `${c.placeLists} list${c.placeLists === 1 ? "" : "s"}`,
    series: (c) => c.activity.places,
  },
];

export default async function AdminDashboard() {
  const [c, writing, health] = await Promise.all([
    countAll(),
    recentWriting(),
    runHealthChecks().catch(() => [] as CheckResult[]),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-xs text-light-fourth">
          Postgres-backed admin. Editing any collection writes through
          /api/admin/* — public pages read the same database.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TILES.map((t) => {
          const series = t.series(c);
          const secondary = t.secondary?.(c);
          return (
            <Link
              key={t.href}
              href={t.href}
              className="group rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-4 hover:ring-white/20 transition-colors relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <t.Icon className="w-4 h-4 text-light-fourth group-hover:text-white transition-colors" />
                <ArrowUpRight className="w-3.5 h-3.5 text-light-fourth/60 group-hover:text-white transition-colors" />
              </div>
              <div className="mt-3 text-2xl font-semibold tabular-nums">
                {t.count(c)}
              </div>
              <div className="mt-0.5 text-xs text-light-fourth">{t.label}</div>
              {secondary && (
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-light-fourth/70">
                  {secondary}
                </div>
              )}
              <div
                className="pointer-events-none absolute right-2 bottom-2 text-accent-primary/80 group-hover:text-accent-primary transition-colors"
                title={`Last ${ACTIVITY_DAYS} days`}
              >
                <Sparkline values={series} />
              </div>
            </Link>
          );
        })}

        <Link
          href="/admin/settings/home"
          className="group rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-4 hover:ring-white/20 transition-colors"
        >
          <div className="flex items-center justify-between">
            <Settings className="w-4 h-4 text-light-fourth group-hover:text-white transition-colors" />
            <ArrowUpRight className="w-3.5 h-3.5 text-light-fourth/60 group-hover:text-white transition-colors" />
          </div>
          <div className="mt-3 text-sm font-medium">Home page settings</div>
          <div className="mt-0.5 text-xs text-light-fourth">
            Intro, socials, timezone
          </div>
        </Link>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-widest text-light-fourth">
            Recent writing
          </span>
          <div className="flex items-center gap-1.5">
            <Link
              href="/admin/posts/new"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] ring-1 ring-white/[0.08] text-light-secondary hover:text-white hover:ring-white/20 transition-colors"
            >
              <Plus className="w-3 h-3" /> Post
            </Link>
            <Link
              href="/admin/thoughts/new"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] ring-1 ring-white/[0.08] text-light-secondary hover:text-white hover:ring-white/20 transition-colors"
            >
              <Plus className="w-3 h-3" /> Thought
            </Link>
          </div>
        </div>
        <ul className="divide-y divide-white/[0.04] ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950">
          {writing.length === 0 && (
            <li className="px-4 py-6 text-sm text-light-fourth text-center">
              Nothing written yet.
            </li>
          )}
          {writing.map((w) => (
            <li key={w.key}>
              <Link
                href={w.href}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors"
              >
                {w.kind === "post" ? (
                  <PenLine className="w-3.5 h-3.5 text-accent-primary shrink-0" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5 text-light-fourth shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-white">
                  {w.title}
                </span>
                {w.draft && (
                  <span className="shrink-0 inline-flex items-center rounded-full px-2 py-[3px] text-[10px] leading-none uppercase tracking-wider ring-1 ring-amber-400/40 bg-amber-400/10 text-amber-300">
                    draft
                  </span>
                )}
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-light-fourth/70">
                  {w.kind === "post" ? "Essay" : "Thought"}
                </span>
                <time className="shrink-0 w-20 text-right text-xs text-light-fourth tabular-nums">
                  {w.date.slice(0, 10)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {health.length > 0 && (
        <section>
          <div className="mb-2 text-xs uppercase tracking-widest text-light-fourth">
            System
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {health.map((h) => (
              <HealthCard key={h.label} check={h} />
            ))}
          </div>
        </section>
      )}

      <Link
        href="/admin/logins"
        className="block rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-4 hover:ring-white/20 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-light-fourth">
            Logins (last 24h)
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-light-fourth/60" />
        </div>
        <div className="mt-2 flex items-baseline gap-6 text-sm">
          <span>
            <span className="text-emerald-400 font-semibold tabular-nums">
              {c.logins.ok}
            </span>{" "}
            <span className="text-light-fourth">ok</span>
          </span>
          <span>
            <span className="text-rose-400 font-semibold tabular-nums">
              {c.logins.fail}
            </span>{" "}
            <span className="text-light-fourth">failed</span>
          </span>
        </div>
        {c.recentLogins.length > 0 && (
          <ul className="mt-3 divide-y divide-white/[0.04] border-t border-white/[0.06] pt-2">
            {c.recentLogins.map((r) => (
              <li
                key={r.id}
                className="py-1 flex items-center gap-2 text-xs text-light-fourth"
              >
                {r.ok ? (
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : (
                  <X className="w-3 h-3 text-rose-400 shrink-0" />
                )}
                <time
                  dateTime={r.at}
                  className="tabular-nums text-light-secondary"
                >
                  {formatLoginAt(r.at)}
                </time>
                <span className="ml-auto font-mono text-[10px] text-light-fourth/70 truncate max-w-[55%]">
                  {r.ip ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Link>

      <UploadsSweepCard />
    </div>
  );
}

function formatLoginAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DOT_COLOR: Record<CheckResult["status"], string> = {
  ok: "bg-emerald-400",
  warn: "bg-amber-400",
  error: "bg-rose-400",
  unknown: "bg-zinc-500",
};

function HealthCard({ check }: { check: CheckResult }) {
  const dot = DOT_COLOR[check.status];
  const isExternal = check.href?.startsWith("http");
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${dot} shrink-0`}
          aria-hidden
        />
        <span className="text-[10px] uppercase tracking-widest text-light-fourth truncate">
          {check.label}
        </span>
        {check.href && (
          <ArrowUpRight className="ml-auto w-3 h-3 text-light-fourth/60" />
        )}
      </div>
      <div className="mt-1.5 text-xs text-light-secondary break-words">
        {check.value}
      </div>
    </>
  );

  const className = "rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-3 block";
  if (!check.href) {
    return <div className={className}>{body}</div>;
  }
  if (isExternal) {
    return (
      <a
        href={check.href}
        target="_blank"
        rel="noreferrer"
        className={`${className} hover:ring-white/20 transition-colors`}
      >
        {body}
      </a>
    );
  }
  return (
    <Link
      href={check.href}
      className={`${className} hover:ring-white/20 transition-colors`}
    >
      {body}
    </Link>
  );
}
