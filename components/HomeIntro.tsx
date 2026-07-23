import { Fragment } from "react";
import {
  getExperiences,
  getHomeSettings,
  getLatestThought,
  getPosts,
} from "@/lib/content";
import { BOOKMARK_LISTS, getKarakeepLatestFromLists } from "@/lib/karakeep";
import { HomeSocialLink } from "@/components/HomeSocialLink";
import AsciiPortrait from "@/components/AsciiPortrait";
import GithubCommitHistory from "@/components/GithubCommitHistory";
import Time from "@/components/Time";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error("[HomeIntro] fetch failed:", e);
    return fallback;
  }
}

export default async function HomeIntro() {
  const [settings, experiences, posts, thought, bookmark] = await Promise.all([
    getHomeSettings(),
    getExperiences(),
    safe(() => getPosts(), []),
    safe(() => getLatestThought(), null),
    safe(
      () => getKarakeepLatestFromLists(BOOKMARK_LISTS.map((l) => l.id)),
      null,
    ),
  ]);

  // The admin's manual `order` decides which experience is primary (lowest
  // first), tie-broken by most recent start — that's the "current role".
  const parseDMY = (s: string) => {
    const [d, m, y] = s.split("/").map(Number);
    return new Date(y || 0, (m || 1) - 1, d || 1).getTime();
  };
  const current = [...experiences].sort((a, b) => {
    const oa = a.order ?? 100;
    const ob = b.order ?? 100;
    if (oa !== ob) return oa - ob;
    return parseDMY(b.start_date) - parseDMY(a.start_date);
  })[0];

  // Latest writing (post or thought, whichever is newer) → the "note" row.
  const latestPost = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0];
  const noteCandidates: { date: string; title: string; href: string }[] = [];
  if (latestPost) {
    noteCandidates.push({
      date: latestPost.date,
      title: latestPost.title,
      href: `/writing/${latestPost.slug}`,
    });
  }
  if (thought) {
    const preview = thought.body.replace(/\s+/g, " ").trim();
    noteCandidates.push({
      date: thought.createdAt,
      title:
        preview.length > 60
          ? `${preview.slice(0, 60)}…`
          : preview || `Thought #${thought.id}`,
      href: `/writing#t-${thought.id}`,
    });
  }
  noteCandidates.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const note = noteCandidates[0] ?? null;
  const save = bookmark ? { title: bookmark.title, href: bookmark.link } : null;

  const rows: { key: string; value: React.ReactNode }[] = [];

  if (current) {
    rows.push({
      key: "role",
      value: (
        <a
          href="/experience"
          className="text-light-secondary hover:text-accent-primary transition-colors duration-200"
        >
          {`${current.title} @ ${current.organization}`}
        </a>
      ),
    });
  }

  rows.push(
    {
      key: "based",
      value: (
        <span className="whitespace-nowrap">
          {settings.location}
          <span className="text-light-fourth/50"> · </span>
          <span className="text-light-third tabular-nums [&>div]:inline">
            <Time
              location={settings.timezone}
              shortName={settings.timezoneLabel}
            />
          </span>
        </span>
      ),
    },
    { key: "focus", value: settings.focus },
    { key: "watching", value: settings.watching },
  );

  if (note) {
    rows.push({
      key: "note",
      value: (
        <a
          href={note.href}
          className="block truncate text-light-third hover:text-accent-primary transition-colors duration-200"
          title={note.title}
        >
          {note.title}
        </a>
      ),
    });
  }

  if (save) {
    rows.push({
      key: "save",
      value: (
        <a
          href={save.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-light-third hover:text-accent-primary transition-colors duration-200"
          title={save.title}
        >
          {save.title}
        </a>
      ),
    });
  }

  rows.push({
    key: "gadgets",
    value: (
      <a
        href="/gadgets"
        className="group inline-flex items-center gap-1 text-light-third transition-colors duration-200 hover:text-accent-primary"
      >
        the gear I use daily
        <span className="transition-transform duration-200 group-hover:translate-x-0.5">
          →
        </span>
      </a>
    ),
  });

  if (settings.pgpId) {
    rows.push({
      key: "pgp",
      value: (
        <a
          href="/pgp.asc"
          className="text-light-third hover:text-accent-primary transition-colors duration-200"
          title="Download PGP public key"
        >
          {settings.pgpId}
        </a>
      ),
    });
  }

  if (settings.socials.length > 0) {
    rows.push({
      key: "social",
      value: (
        <div className="flex flex-wrap items-center gap-3 stagger">
          {settings.socials.map((s) => (
            <HomeSocialLink key={s.name + s.url} social={s} />
          ))}
        </div>
      ),
    });
  }

  return (
    <div className="mt-24 flex w-full max-w-3xl flex-col items-start px-4 text-left mx-auto sm:px-6 lg:px-8">
      <div className="mb-8 flex w-full select-none flex-col items-start gap-6 sm:flex-row sm:gap-8">
        <AsciiPortrait className="animate-fade-in" />

        <div className="min-w-0 flex-1 animate-fade-in-down font-mono text-[11px] leading-relaxed sm:text-xs">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">
            {rows.map((row) => (
              <Fragment key={row.key}>
                <dt className="text-light-fourth/60">{row.key}</dt>
                <dd className="min-w-0 text-light-secondary">{row.value}</dd>
              </Fragment>
            ))}
          </dl>
        </div>
      </div>

      {/* On mobile the graph sits above the intro text; on sm+ the text comes first. */}
      <div className="flex w-full flex-col gap-8 pb-16">
        <p className="order-2 text-base text-justify animate-fade-in-up delay-200 whitespace-pre-line sm:order-1">
          {settings.intro}
        </p>
        <section className="order-1 w-full animate-fade-in-up delay-300 sm:order-2">
          <GithubCommitHistory />
        </section>
      </div>
    </div>
  );
}
