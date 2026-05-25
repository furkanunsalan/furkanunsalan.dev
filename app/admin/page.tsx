import Link from "next/link";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  PenLine,
  FolderGit2,
  Briefcase,
  Wrench,
  MapPin,
  Settings,
  Github,
  ArrowUpRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function countAll() {
  const [posts, projects, experiences, tools, places, github, logins] =
    await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(schema.posts),
      db.select({ n: sql<number>`count(*)::int` }).from(schema.projects),
      db.select({ n: sql<number>`count(*)::int` }).from(schema.experiences),
      db.select({ n: sql<number>`count(*)::int` }).from(schema.tools),
      db.select({ n: sql<number>`count(*)::int` }).from(schema.places),
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
    ]);
  return {
    posts: posts[0]?.n ?? 0,
    projects: projects[0]?.n ?? 0,
    experiences: experiences[0]?.n ?? 0,
    tools: tools[0]?.n ?? 0,
    places: places[0]?.n ?? 0,
    github: github[0]?.n ?? 0,
    logins: logins[0] ?? { ok: 0, fail: 0 },
  };
}

const TILES: {
  label: string;
  href: string;
  key: keyof Awaited<ReturnType<typeof countAll>>;
  Icon: typeof PenLine;
}[] = [
  { label: "Posts", href: "/admin/posts", key: "posts", Icon: PenLine },
  {
    label: "Projects",
    href: "/admin/projects",
    key: "projects",
    Icon: FolderGit2,
  },
  {
    label: "Experiences",
    href: "/admin/experiences",
    key: "experiences",
    Icon: Briefcase,
  },
  { label: "Tools", href: "/admin/tools", key: "tools", Icon: Wrench },
  { label: "Places", href: "/admin/places", key: "places", Icon: MapPin },
  {
    label: "GitHub repos",
    href: "/admin/settings/github",
    key: "github",
    Icon: Github,
  },
];

export default async function AdminDashboard() {
  const c = await countAll();

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
        {TILES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-4 hover:ring-white/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <t.Icon className="w-4 h-4 text-light-fourth group-hover:text-white transition-colors" />
              <ArrowUpRight className="w-3.5 h-3.5 text-light-fourth/60 group-hover:text-white transition-colors" />
            </div>
            <div className="mt-3 text-2xl font-semibold tabular-nums">
              {c[t.key] as number}
            </div>
            <div className="mt-0.5 text-xs text-light-fourth">{t.label}</div>
          </Link>
        ))}

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

      <section className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-4">
        <div className="text-xs uppercase tracking-widest text-light-fourth mb-2">
          Logins (last 24h)
        </div>
        <div className="flex items-baseline gap-6 text-sm">
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
      </section>
    </div>
  );
}
