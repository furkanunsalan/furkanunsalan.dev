// Pure query parsing and snippet shaping for global search. Deliberately free
// of any DB import so client islands can share these types and helpers without
// pulling postgres into the browser bundle. The SQL half lives in lib/search.ts.

import { plainTextFromMarkdoc } from "@/lib/excerpt";
import { splitSections } from "@/lib/headings";

export const SEARCH_KINDS = [
  "post",
  "project",
  "thought",
  "experience",
  "place",
  "tool",
] as const;

export type SearchKind = (typeof SEARCH_KINDS)[number];

// GitHub repos are searchable too, but they come from the API rather than
// Postgres, so they're matched in-process and merged into the ranked results.
export const ALL_KINDS = [...SEARCH_KINDS, "repo"] as const;

export type HitKind = (typeof ALL_KINDS)[number];

export type SearchHit = {
  kind: HitKind;
  title: string;
  subtitle: string;
  snippet: string;
  href: string;
  date?: string;
  score: number;
};

const SNIPPET_LEN = 200;

// ---- query parsing -------------------------------------------------------

export type ParsedQuery = {
  /** Text handed to websearch_to_tsquery — phrases and -exclusions intact. */
  base: string;
  /** Trailing lexeme with :* appended, for as-you-type prefix matching. */
  prefix: string;
  /** Bare terms used to locate and highlight the match inside a body. */
  terms: string[];
};

const OPERATORS = new Set(["or", "and"]);

function sanitizeLexeme(token: string): string {
  return token.replace(/[^\p{L}\p{N}_]/gu, "");
}

/**
 * Split user input into a websearch base plus an optional prefix term. The last
 * word only becomes a prefix while it's still being typed — once the user types
 * a space it's treated as complete, so "post" stops also matching "postgres".
 */
export function parseQuery(raw: string): ParsedQuery {
  const trimmed = (raw || "").replace(/\s+/g, " ").trim();
  if (!trimmed) return { base: "", prefix: "", terms: [] };

  const tokens: string[] = trimmed.match(/"[^"]*"?|\S+/g) ?? [];
  const midWord = !/\s$/.test(raw || "");
  const last = tokens[tokens.length - 1] || "";
  const lastIsPlain = !last.startsWith('"') && !last.startsWith("-");

  let baseTokens = tokens;
  let prefix = "";
  if (midWord && lastIsPlain && tokens.length > 0) {
    const lexeme = sanitizeLexeme(last);
    if (lexeme) {
      baseTokens = tokens.slice(0, -1);
      prefix = `${lexeme}:*`;
    }
  }

  const terms = tokens
    .map((t) => t.replace(/^-/, "").replace(/"/g, "").trim())
    .filter((t) => t.length > 1 && !OPERATORS.has(t.toLowerCase()));

  return { base: baseTokens.join(" "), prefix, terms };
}

// ---- snippets ------------------------------------------------------------

function windowAround(text: string, at: number, len: number): string {
  if (text.length <= len) return text;
  const half = Math.floor(len / 2);
  let start = Math.max(0, at - half);
  let end = Math.min(text.length, start + len);
  start = Math.max(0, end - len);
  // Don't cut mid-word.
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space !== -1 && space < start + 24) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space > start) end = space;
  }
  const slice = text.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`;
}

/**
 * Cut a snippet around the first term hit, and report which heading section it
 * landed in so the result can deep-link to that anchor.
 */
export function makeSnippet(
  source: string,
  terms: string[],
  len = SNIPPET_LEN,
): { snippet: string; anchor: string | null } {
  const sections = splitSections(source || "");

  for (const section of sections) {
    const text = plainTextFromMarkdoc(section.body);
    if (!text) continue;
    const haystack = text.toLowerCase();
    let best = -1;
    for (const term of terms) {
      const at = haystack.indexOf(term.toLowerCase());
      if (at !== -1 && (best === -1 || at < best)) best = at;
    }
    if (best !== -1) {
      return { snippet: windowAround(text, best, len), anchor: section.id };
    }
  }

  // Match came from a title, tag or facet — lead with the opening prose.
  const lead = plainTextFromMarkdoc(source || "");
  return { snippet: lead.slice(0, len).trim(), anchor: null };
}

export function hrefFor(
  kind: SearchKind,
  ref: string,
  anchor: string | null,
): string {
  switch (kind) {
    case "post":
      return `/writing/${ref}${anchor ? `#${anchor}` : ""}`;
    case "project":
      return `/projects/${ref}${anchor ? `#${anchor}` : ""}`;
    case "thought":
      return `/writing#t-${ref}`;
    case "place":
      return `/places#${ref}`;
    case "experience":
      return "/experience";
    case "tool":
      return "/gadgets";
  }
}

/**
 * Tags that describe a post's form rather than its subject. Counting them as
 * topical overlap relates any two English posts to each other, or any two
 * Turkish ones. Normalized form (lowercase, letters/digits only) — extend this
 * as the tag vocabulary grows.
 */
export const NON_TOPICAL_TAGS = new Set(["english", "türkçe", "turkce"]);

/** Lowercase, punctuation-free form used to compare tags across posts. */
export function normalizeTag(tag: string): string {
  return tag.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Turn one raw token into a tsquery atom. A multi-word token becomes an
 * adjacency phrase rather than OR-ed halves: "self-hosting" has to match the
 * compound, because OR-ing it would let the generic lexeme "self" match an
 * unrelated tag like "Self Improvement".
 */
function tsqueryAtom(raw: string): string | null {
  const parts = raw
    .split(/[^\p{L}\p{N}_]+/u)
    .map((p) => p.toLowerCase())
    .filter((p) => p.length > 2);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return `(${parts.join(" <-> ")})`;
}

/**
 * OR-ed tsquery text over free-form words. Where websearch_to_tsquery ANDs
 * every term — so one typo returns nothing — this matches on any of them,
 * which is what "did you mean" needs.
 */
export function anyQueryText(words: string[]): string {
  const atoms = new Set<string>();
  for (const raw of words) {
    const atom = tsqueryAtom(raw);
    if (atom) atoms.add(atom);
  }
  return [...atoms].join(" | ");
}

/**
 * OR-ed tsquery text describing a post, used to find posts like it. Built from
 * its tags and title; each token contributes one atom.
 */
export function relatedQueryText(title: string, tags: string[]): string {
  const topical = tags.filter((t) => !NON_TOPICAL_TAGS.has(normalizeTag(t)));
  return anyQueryText([...topical, ...title.split(/\s+/)]);
}
