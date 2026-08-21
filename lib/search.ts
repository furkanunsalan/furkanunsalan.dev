import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { cachedReader } from "@/lib/cache";
import { plainTextFromMarkdoc } from "@/lib/excerpt";
import {
  hrefFor,
  makeSnippet,
  parseQuery,
  relatedQueryText,
  anyQueryText,
  normalizeTag,
  NON_TOPICAL_TAGS,
  SEARCH_KINDS,
  ALL_KINDS,
  type HitKind,
  type ParsedQuery,
  type SearchHit,
  type SearchKind,
} from "@/lib/search-query";

export {
  SEARCH_KINDS,
  ALL_KINDS,
  parseQuery,
  makeSnippet,
  type HitKind,
  type ParsedQuery,
  type SearchHit,
  type SearchKind,
};

// ---- SQL -----------------------------------------------------------------

// Per-kind bias applied to the normalized rank so a post can outrank a gadget
// at equal textual relevance. Ranks are normalized to 0..1 (ts_rank_cd flag 32),
// which is what makes them comparable across tables in the first place.
const BIAS: Record<SearchKind, number> = {
  post: 1,
  project: 0.95,
  thought: 0.8,
  experience: 0.7,
  place: 0.6,
  tool: 0.55,
};

type Source = {
  kind: SearchKind;
  from: string;
  ref: string;
  title: string;
  subtitle: string;
  body: string;
  date: string;
  where: string;
  /** Column the trigram fallback fuzzy-matches against; null opts the source
   *  out of that tier, for rows with no name worth fuzzy-matching. */
  fuzzy: string | null;
};

const SOURCES: Source[] = [
  {
    kind: "post",
    from: "posts t",
    ref: "t.slug::text",
    title: "t.title",
    subtitle: "array_to_string(t.tags, ' \u00b7 ')",
    body: "t.content",
    date: "t.date::text",
    where: "t.draft = false and t.deleted_at is null",
    fuzzy: "t.title",
  },
  {
    kind: "project",
    from: "projects t",
    ref: "t.slug::text",
    title: "t.name",
    subtitle: "coalesce(t.description, '')",
    body: "t.content",
    date: "null::text",
    where: "t.deleted_at is null",
    fuzzy: "t.name",
  },
  {
    kind: "thought",
    from: "thoughts t",
    ref: "t.id::text",
    title: "''",
    subtitle: "array_to_string(t.tags, ' \u00b7 ')",
    body: "t.body",
    date: "t.created_at::text",
    where: "t.draft = false and t.deleted_at is null",
    // A thought has no title — fuzzy-matching its whole body only yields noise.
    fuzzy: null,
  },
  {
    kind: "experience",
    from: "experiences t",
    ref: "t.id::text",
    title: "t.title || ' \u00b7 ' || t.organization",
    subtitle: "t.organization",
    body: "t.comment",
    date: "t.start_date::text",
    where: "t.deleted_at is null",
    fuzzy: "t.organization",
  },
  {
    kind: "place",
    from: "places t",
    ref: "t.slug::text",
    title: "t.name",
    subtitle:
      "nullif(concat_ws(' \u00b7 ', nullif(t.city, ''), nullif(t.country, '')), '')",
    body: "t.notes",
    date: "t.added_at::text",
    where: "t.deleted_at is null",
    fuzzy: "t.name",
  },
  {
    kind: "tool",
    from: "tools t",
    ref: "t.name::text",
    title: "nullif(trim(concat_ws(' ', t.brand, t.what)), '')",
    subtitle: "t.brand",
    body: "t.comment",
    date: "null::text",
    where: "t.deleted_at is null",
    fuzzy: "t.brand",
  },
];

type Row = {
  kind: SearchKind;
  ref: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  date: string | null;
  rank: number;
};

function selected(kinds?: SearchKind[]): Source[] {
  if (!kinds || kinds.length === 0) return SOURCES;
  const want = new Set(kinds);
  return SOURCES.filter((s) => want.has(s.kind));
}

function union(parts: SQL[]): SQL {
  return sql.join(parts, sql` union all `);
}

/**
 * Tier 1: weighted full-text match over the generated tsvector columns.
 * `flag 32` normalizes rank to 0..1 so the per-kind bias means something.
 */
async function ftsRows(
  parsed: ParsedQuery,
  limit: number,
  kinds?: SearchKind[],
  anyText?: string,
): Promise<Row[]> {
  const sources = selected(kinds);
  if (sources.length === 0) return [];

  let queryExpr: SQL;
  let inner: SQL;
  if (anyText) {
    inner = sql`select to_tsquery('english', ${anyText}) as base`;
    queryExpr = sql`base`;
  } else if (parsed.base && parsed.prefix) {
    inner = sql`select websearch_to_tsquery('english', ${parsed.base}) as base, to_tsquery('english', ${parsed.prefix}) as pfx`;
    // Base tokens can stem away entirely (all stopwords), so pick at runtime.
    queryExpr = sql`case when numnode(base) = 0 then pfx when numnode(pfx) = 0 then base else base && pfx end`;
  } else if (parsed.prefix) {
    inner = sql`select to_tsquery('english', ${parsed.prefix}) as pfx`;
    queryExpr = sql`pfx`;
  } else {
    inner = sql`select websearch_to_tsquery('english', ${parsed.base}) as base`;
    queryExpr = sql`base`;
  }

  const branches = sources.map(
    (s) =>
      sql`select ${sql.raw(`'${s.kind}'::text as kind, ${s.ref} as ref, ${s.title} as title, ${s.subtitle} as subtitle, ${s.body} as body, ${s.date} as date, ts_rank_cd(t.search_vector, tsq.query, 32) * ${BIAS[s.kind]} as rank from ${s.from}, tsq where ${s.where} and t.search_vector @@ tsq.query`)}`,
  );

  const rows = await db.execute(sql`
    with tsq as (select ${queryExpr} as query from (${inner}) q)
    select kind, ref, title, subtitle, body, date, rank
    from (${union(branches)}) hits
    where rank > 0
    order by rank desc, date desc nulls last
    limit ${limit}
  `);
  return rows as unknown as Row[];
}

let trigramReady: boolean | null = null;

async function hasTrigram(): Promise<boolean> {
  if (trigramReady !== null) return trigramReady;
  try {
    const rows = (await db.execute(
      sql`select 1 as ok from pg_extension where extname = 'pg_trgm'`,
    )) as unknown as unknown[];
    trigramReady = rows.length > 0;
  } catch {
    trigramReady = false;
  }
  return trigramReady;
}

/**
 * Tier 2: only runs when full-text found nothing. Trigram similarity catches
 * typos; without pg_trgm it degrades to a substring match, which still rescues
 * partial words that prefix matching can't reach ("grate" inside "integrate").
 */
async function fuzzyRows(
  raw: string,
  limit: number,
  kinds?: SearchKind[],
): Promise<Row[]> {
  const sources = selected(kinds).filter(
    (s): s is Source & { fuzzy: string } => s.fuzzy !== null,
  );
  const needle = raw.trim();
  if (sources.length === 0 || needle.length < 3) return [];

  const trigram = await hasTrigram();
  const pattern = `%${needle}%`;

  const branches = sources.map((s) => {
    const columns = sql.raw(
      `'${s.kind}'::text as kind, ${s.ref} as ref, ${s.title} as title, ${s.subtitle} as subtitle, ${s.body} as body, ${s.date} as date, `,
    );
    const rank = trigram
      ? sql`similarity(${sql.raw(s.fuzzy)}, ${needle}) * ${sql.raw(String(BIAS[s.kind]))}`
      : sql`${sql.raw(String(0.25 * BIAS[s.kind]))}::float8`;
    const match = trigram
      ? sql`${sql.raw(s.fuzzy)} % ${needle}`
      : sql`${sql.raw(s.fuzzy)} ilike ${pattern}`;
    return sql`select ${columns} ${rank} as rank from ${sql.raw(s.from)} where ${sql.raw(s.where)} and ${match}`;
  });

  const rows = await db.execute(sql`
    select kind, ref, title, subtitle, body, date, rank
    from (${union(branches)}) hits
    where rank > 0
    order by rank desc, date desc nulls last
    limit ${limit}
  `);
  return rows as unknown as Row[];
}

function toHit(row: Row, terms: string[]): SearchHit {
  const body = row.body || "";
  const { snippet, anchor } = makeSnippet(body, terms);
  const title =
    (row.title || "").trim() ||
    // Thoughts have no title — lead with their first line.
    plainTextFromMarkdoc(body).slice(0, 80).trim() ||
    row.ref;

  const hit: SearchHit = {
    kind: row.kind,
    title,
    subtitle: (row.subtitle || "").trim(),
    snippet,
    href: hrefFor(row.kind, row.ref, anchor),
    score: Number(row.rank) || 0,
  };
  if (row.date) hit.date = row.date;
  return hit;
}

/**
 * Global search across every Postgres-backed collection. Fails soft: a DB blip
 * returns no results rather than 500-ing the page that called it.
 */
export async function search(
  raw: string,
  opts: {
    limit?: number;
    kinds?: SearchKind[];
    /** "any" ORs the terms instead of ANDing them — for did-you-mean. */
    match?: "all" | "any";
  } = {},
): Promise<SearchHit[]> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 50);
  const parsed = parseQuery(raw);
  if (!parsed.base && !parsed.prefix) return [];

  const anyText =
    opts.match === "any" ? anyQueryText(raw.split(/\s+/)) : undefined;
  if (opts.match === "any" && !anyText) return [];

  // Quotes and -exclusions are a request for precision. Rescuing an empty
  // result set with fuzzy matches would quietly contradict that.
  const explicit = /["]/.test(raw) || /(^|\s)-\S/.test(raw);

  try {
    let rows = await ftsRows(parsed, limit, opts.kinds, anyText);
    if (rows.length === 0 && !explicit) {
      rows = await fuzzyRows(raw, limit, opts.kinds);
    }
    return rows.map((r) => toHit(r, parsed.terms));
  } catch (e) {
    console.error("[search] query failed:", e);
    return [];
  }
}

// ---- related posts -------------------------------------------------------

export type RelatedPost = {
  slug: string;
  title: string;
  date: string;
  excerpt?: string;
  tags: string[];
  score: number;
};

// Tag overlap is the strongest "related" signal on a personal blog, so it gets
// a flat bonus on top of the normalized text rank rather than competing with it.
const SHARED_TAG_WEIGHT = 0.35;

// Interpolating a JS array into drizzle's sql`` expands it to a tuple
// ($2, $3, ...), not an array parameter, so `= any($n::text[])` is a syntax
// error. Ship the tags as one delimited string and rebuild the array in SQL.
// U+001F (unit separator) can't occur in a tag.
const TAG_SEP = "\u001f";

// Tag vocabulary drifts by hand ("Self Hosting" on one post, "self-hosting" on
// another). Compare on a case- and punctuation-insensitive form so the two count
// as the same tag on both sides of the join.
function normalizeTags(tags: string[]): string[] {
  return tags.map(normalizeTag).filter((t) => t && !NON_TOPICAL_TAGS.has(t));
}

// Two floors, because either alone misses a case. The relative one drops a weak
// straggler trailing a strong hit; the absolute one handles the case a relative
// floor can't express — "everything here is weak" — since it always keeps its
// own top row. Ranks are normalized to 0..1 and a shared tag is worth 0.35, so
// MIN_SCORE means: one shared tag plus some text support, two shared tags
// outright, or a genuinely strong text match. Measured against the current
// archive, correct pairs scored >= 0.55 and coincidences <= 0.44.
const RELATIVE_FLOOR = 0.4;
const MIN_SCORE = 0.5;

async function relatedPostsQuery(
  slug: string,
  title: string,
  tags: string[],
  limit: number,
): Promise<RelatedPost[]> {
  const queryText = relatedQueryText(title, tags);
  // Nothing indexable in the title and no tags — there's no signal to rank on.
  if (!queryText) return [];

  const rows = (await db.execute(sql`
    with q as (select to_tsquery('english', ${queryText}) as query),
    candidates as (
      select p.slug,
             p.title,
             p.date::text as date,
             p.excerpt,
             p.tags,
             ts_rank_cd(p.search_vector, q.query, 32) as rank,
             (select count(*)::int from unnest(p.tags) tg
               where lower(regexp_replace(tg, '[^[:alnum:]]', '', 'g'))
                     = any(string_to_array(${normalizeTags(tags).join(TAG_SEP)}, ${TAG_SEP}))) as shared
      from posts p, q
      where p.slug <> ${slug}
        and p.draft = false
        and p.deleted_at is null
    )
    select slug, title, date, excerpt, tags,
           (shared * ${sql.raw(String(SHARED_TAG_WEIGHT))} + rank) as score
    from candidates
    where rank > 0 or shared > 0
    order by score desc, date desc
    limit ${limit}
  `)) as unknown as Array<{
    slug: string;
    title: string;
    date: string;
    excerpt: string | null;
    tags: string[];
    score: number;
  }>;

  const top = rows.length > 0 ? Number(rows[0].score) || 0 : 0;
  const floor = Math.max(top * RELATIVE_FLOOR, MIN_SCORE);

  return rows
    .filter((r) => (Number(r.score) || 0) >= floor)
    .map((r) => {
      const post: RelatedPost = {
        slug: r.slug,
        title: r.title,
        date: r.date,
        tags: r.tags || [],
        score: Number(r.score) || 0,
      };
      if (r.excerpt) post.excerpt = r.excerpt;
      return post;
    });
}

/**
 * Posts most like the given one, ranked by shared tags plus full-text
 * similarity over the same tsvector global search uses. Fails soft via
 * cachedReader's fallback.
 */
export const getRelatedPosts = cachedReader<
  [slug: string, title: string, tags: string[], limit: number],
  RelatedPost[]
>(
  ["getRelatedPosts"],
  ["posts"],
  // No try/catch here on purpose: cachedReader logs the failure and returns the
  // fallback WITHOUT caching it. Swallowing the error inside would turn a
  // transient DB blip into a cached "no related posts" for the full hour TTL.
  relatedPostsQuery,
  [],
);
