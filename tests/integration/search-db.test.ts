/**
 * End-to-end check of the global-search SQL against a real Postgres.
 * Opt-in: nothing runs unless SEARCH_TEST_DATABASE_URL points at a throwaway
 * database that has had db/migrations applied.
 *
 *   docker run -d --name pg -e POSTGRES_PASSWORD=test -e POSTGRES_USER=furkan \
 *     -e POSTGRES_DB=furkanunsalan -p 55432:5432 postgres:17-alpine
 *   DATABASE_URL=postgres://furkan:test@127.0.0.1:55432/furkanunsalan \
 *     node scripts/db-migrate.mjs
 *   SEARCH_TEST_DATABASE_URL=postgres://furkan:test@127.0.0.1:55432/furkanunsalan \
 *     npx vitest run tests/integration
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SearchHit } from "@/lib/search-query";

const url = process.env.SEARCH_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

const POST_BODY = [
  "Some opening prose that mentions nothing special.",
  "",
  "## Deploying the container",
  "",
  "We ship a distroless image and health-check the rollout afterwards.",
  "",
  "## Rolling back",
  "",
  "Keep the previous tag around so a rollback is one command.",
].join("\n");

suite("global search (integration)", () => {
  let getRelatedPosts: (
    slug: string,
    title: string,
    tags: string[],
    limit: number,
  ) => Promise<Array<{ slug: string }>>;
  let search: (
    q: string,
    opts?: { limit?: number; kinds?: string[] },
  ) => Promise<SearchHit[]>;
  let db: { execute: (q: unknown) => Promise<unknown> };
  let sql: typeof import("drizzle-orm").sql;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const drizzle = await import("drizzle-orm");
    sql = drizzle.sql;
    ({ db } = (await import("@/lib/db")) as never);
    ({ search, getRelatedPosts } = (await import("@/lib/search")) as never);

    await db.execute(sql`
      insert into posts (slug, title, date, tags, content, excerpt, draft)
      values
        ('zz-pg', 'Running Postgres in anger', '2026-01-05',
         array['ops','database'], ${POST_BODY}, 'ops notes', false),
        ('zz-draft', 'Unfinished distroless notes', '2026-01-06',
         array['ops'], 'distroless secrets that must stay hidden', '', true)
      on conflict (slug) do nothing`);

    await db.execute(sql`
      insert into posts (slug, title, date, tags, content, draft, deleted_at)
      values ('zz-trashed', 'Trashed distroless post', '2026-01-07',
              array['ops'], 'distroless in the trash', false, now())
      on conflict (slug) do nothing`);

    await db.execute(sql`
      insert into posts (slug, title, date, tags, content, excerpt, draft)
      values
        ('zz-rel-a', 'Indexing tsvectors', '2026-02-01',
         array['ops','database'], 'Generated columns keep the index honest.',
         'on generated columns', false),
        ('zz-rel-b', 'Backups on a budget', '2026-02-02',
         array['ops'], 'pg_dump on a timer, fourteen days of retention.',
         'on backups', false),
        ('zz-rel-c', 'A post about nothing at all', '2026-02-03',
         array['knitting'], 'Wool and needles, no computers involved.',
         'on wool', false)
      on conflict (slug) do nothing`);

    await db.execute(sql`
      insert into projects (slug, name, description, content)
      values ('zz-proj', 'Lighthouse', 'a small static analyzer',
              'It walks the AST and reports orphaned selectors.')
      on conflict (slug) do nothing`);

    await db.execute(sql`
      insert into thoughts (body, tags, draft)
      values ('A stray thought about orphaned selectors and tooling.',
              array['css'], false)`);

    await db.execute(sql`
      insert into places (slug, name, lat, lng, city, country, notes)
      values ('zz-place', 'Kronotrop', 41.03, 28.97, 'Istanbul', 'Turkey',
              'Good filter coffee near the office.')
      on conflict (slug) do nothing`);

    await db.execute(sql`
      insert into tools (name, brand, what, comment)
      values ('zz-keeb', 'HHKB', 'keyboard', 'Topre switches, no arrow keys.')
      on conflict (name) do nothing`);

    await db.execute(sql`
      insert into experiences (id, organization, title, start_date, comment)
      values ('zz-exp', 'Teachfluence', 'Software Engineer', '2024-01-01',
              'Built the GraphQL layer and the entity cache.')
      on conflict (id) do nothing`);
  });

  afterAll(async () => {
    if (!db) return;
    await db.execute(sql`delete from posts where slug like 'zz-%'`);
    await db.execute(sql`delete from projects where slug like 'zz-%'`);
    await db.execute(sql`delete from places where slug like 'zz-%'`);
    await db.execute(sql`delete from tools where name like 'zz-%'`);
    await db.execute(sql`delete from experiences where id like 'zz-%'`);
    await db.execute(
      sql`delete from thoughts where body like 'A stray thought about orphaned%'`,
    );
  });

  it("finds a post by a phrase that only appears in its body", async () => {
    const hits = await search("distroless rollout ");
    const post = hits.find((h) => h.href.startsWith("/writing/zz-pg"));
    expect(post).toBeDefined();
    expect(post!.snippet.toLowerCase()).toContain("distroless");
  });

  it("deep-links a body match to the heading it sits under", async () => {
    const hits = await search("distroless rollout ");
    const post = hits.find((h) => h.href.startsWith("/writing/zz-pg"));
    expect(post!.href).toBe("/writing/zz-pg#deploying-the-container");
  });

  it("prefix-matches the word still being typed", async () => {
    const hits = await search("postg");
    expect(hits.some((h) => h.href.startsWith("/writing/zz-pg"))).toBe(true);
  });

  it("never returns drafts or trashed rows", async () => {
    const hits = await search("distroless ", { limit: 50 });
    const slugs = hits.map((h) => h.href);
    expect(slugs.some((s) => s.includes("zz-draft"))).toBe(false);
    expect(slugs.some((s) => s.includes("zz-trashed"))).toBe(false);
  });

  it("supports quoted phrases", async () => {
    const exact = await search('"orphaned selectors" ');
    expect(exact.length).toBeGreaterThan(0);
    const nonsense = await search('"selectors orphaned" ');
    expect(nonsense.length).toBe(0);
  });

  it("supports -exclusions", async () => {
    const all = await search("orphaned ", { limit: 50 });
    expect(all.some((h) => h.kind === "thought")).toBe(true);
    const filtered = await search("orphaned -stray ", { limit: 50 });
    expect(filtered.some((h) => h.kind === "thought")).toBe(false);
  });

  it("ranks a title match above a body-only match", async () => {
    const hits = await search("lighthouse ");
    expect(hits[0].href).toBe("/projects/zz-proj");
  });

  it("filters by kind", async () => {
    const hits = await search("orphaned ", { kinds: ["thought"], limit: 50 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.kind === "thought")).toBe(true);
  });

  it("searches places, tools and experiences too", async () => {
    expect((await search("kronotrop ")).some((h) => h.kind === "place")).toBe(
      true,
    );
    expect((await search("topre ")).some((h) => h.kind === "tool")).toBe(true);
    expect(
      (await search("teachfluence ")).some((h) => h.kind === "experience"),
    ).toBe(true);
  });

  it("falls back to trigram similarity on a typo", async () => {
    const hits = await search("kronotrup ");
    expect(hits.some((h) => h.kind === "place")).toBe(true);
  });

  it("returns nothing for a blank query", async () => {
    expect(await search("   ")).toEqual([]);
  });

  describe("related posts", () => {
    it("ranks a shared-tag post above an unrelated one", async () => {
      const related = await getRelatedPosts(
        "zz-pg",
        "Running Postgres in anger",
        ["ops", "database"],
        3,
      );
      const slugs = related.map((r) => r.slug);
      expect(slugs).toContain("zz-rel-a");
      expect(slugs.indexOf("zz-rel-a")).toBeLessThan(
        slugs.indexOf("zz-rel-c") === -1 ? 99 : slugs.indexOf("zz-rel-c"),
      );
    });

    it("never includes the post itself", async () => {
      const related = await getRelatedPosts(
        "zz-rel-a",
        "Indexing tsvectors",
        ["ops", "database"],
        5,
      );
      expect(related.some((r) => r.slug === "zz-rel-a")).toBe(false);
    });

    it("excludes drafts and trashed posts", async () => {
      const related = await getRelatedPosts(
        "zz-pg",
        "Running Postgres in anger",
        ["ops"],
        10,
      );
      const slugs = related.map((r) => r.slug);
      expect(slugs).not.toContain("zz-draft");
      expect(slugs).not.toContain("zz-trashed");
    });

    it("respects the limit", async () => {
      const related = await getRelatedPosts(
        "zz-pg",
        "Running Postgres",
        ["ops"],
        1,
      );
      expect(related.length).toBe(1);
    });

    it("survives a title of nothing but stopwords and no tags", async () => {
      await expect(
        getRelatedPosts("zz-pg", "the and of", [], 3),
      ).resolves.toEqual([]);
    });

    it("still relates on text alone when there are no shared tags", async () => {
      const related = await getRelatedPosts(
        "zz-pg",
        "tsvectors indexing",
        [],
        3,
      );
      expect(related.some((r) => r.slug === "zz-rel-a")).toBe(true);
    });
  });
});
