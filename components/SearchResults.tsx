"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  FileText,
  FolderGit2,
  Github,
  MapPin,
  Wrench,
  Briefcase,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import { ALL_KINDS, type HitKind, type SearchHit } from "@/lib/search-query";
import { KIND_LABEL, highlightTerms, queryTerms } from "@/components/search-ui";

const ICONS: Record<HitKind, typeof FileText> = {
  post: FileText,
  project: FolderGit2,
  repo: Github,
  place: MapPin,
  tool: Wrench,
  experience: Briefcase,
  thought: MessageSquare,
};

const DEBOUNCE_MS = 180;
const LIMIT = 30;

type Props = {
  initialQuery: string;
  initialResults: SearchHit[];
};

export default function SearchResults({ initialQuery, initialResults }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [kinds, setKinds] = useState<HitKind[]>([]);
  const [results, setResults] = useState<SearchHit[]>(initialResults);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(initialQuery.trim().length > 0);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  // The server already ran the initial query — don't repeat it on mount.
  const primed = useRef(true);

  const terms = useMemo(() => queryTerms(query), [query]);

  const run = useCallback(async (q: string, activeKinds: HitKind[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;

    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      setPending(false);
      return;
    }

    setPending(true);
    try {
      const params = new URLSearchParams({ q, limit: String(LIMIT) });
      if (activeKinds.length > 0) params.set("kinds", activeKinds.join(","));
      const res = await fetch(`/api/search?${params}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const json = await res.json();
      if (seq !== seqRef.current) return;
      setResults(Array.isArray(json.items) ? (json.items as SearchHit[]) : []);
      setSearched(true);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        console.error("[SearchResults] search failed:", e);
      }
    } finally {
      if (seq === seqRef.current) setPending(false);
    }
  }, []);

  useEffect(() => {
    if (primed.current) {
      primed.current = false;
      return;
    }
    const t = setTimeout(() => run(query, kinds), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, kinds, run]);

  // Keep the URL shareable without pushing a history entry per keystroke.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set("q", query.trim());
    else url.searchParams.delete("q");
    window.history.replaceState({}, "", url);
  }, [query]);

  const toggleKind = (kind: HitKind) =>
    setKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
    );

  const counts = useMemo(() => {
    const map = new Map<HitKind, number>();
    for (const r of results) map.set(r.kind, (map.get(r.kind) || 0) + 1);
    return map;
  }, [results]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 mb-16">
      <h1 className="text-2xl font-bold text-white mb-6">Search</h1>

      {/* Plain GET form so the page still works with JS disabled. */}
      <form
        method="get"
        action="/search"
        onSubmit={(e) => e.preventDefault()}
        role="search"
      >
        <div className="flex items-center gap-3 border-b border-white/[0.08] focus-within:border-white/25 transition-colors">
          <Search className="w-5 h-5 text-light-fourth shrink-0" />
          <input
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search writing, projects, places, gadgets…"
            className="flex-1 bg-transparent border-0 outline-none focus:outline-none py-3 text-xl text-white placeholder:text-light-fourth"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            aria-label="Search query"
          />
        </div>
      </form>

      <div
        className="flex flex-wrap gap-x-4 gap-y-2 mt-5"
        role="group"
        aria-label="Filter by type"
      >
        {ALL_KINDS.map((kind) => {
          const active = kinds.includes(kind);
          const n = counts.get(kind);
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggleKind(kind)}
              aria-pressed={active}
              className={`text-[10px] uppercase tracking-wider transition-colors ${
                active
                  ? "text-white underline underline-offset-4 decoration-accent-primary"
                  : "text-light-fourth hover:text-light-secondary"
              }`}
            >
              {KIND_LABEL[kind]}
              {n ? <span className="ml-1 opacity-60">{n}</span> : null}
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-light-fourth" aria-live="polite">
        {pending
          ? "Searching…"
          : !query.trim()
            ? "Type to search everything on the site."
            : searched
              ? `${results.length} result${results.length === 1 ? "" : "s"}`
              : ""}
      </p>

      <div className="mt-4 divide-y divide-white/[0.06]">
        {results.map((item, idx) => {
          const Icon = ICONS[item.kind];
          const external = /^https?:\/\//i.test(item.href);
          return (
            <a
              key={`${item.kind}-${item.href}-${idx}`}
              href={item.href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className="group flex gap-4 py-4 transition-colors"
            >
              <Icon className="w-4 h-4 mt-1 shrink-0 text-light-fourth" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-white group-hover:text-accent-primary transition-colors">
                    {highlightTerms(item.title, terms)}
                  </span>
                  {external ? (
                    <ArrowUpRight className="w-3 h-3 text-light-fourth shrink-0" />
                  ) : null}
                </div>
                {item.snippet ? (
                  <p className="mt-1 text-xs leading-relaxed text-light-fourth line-clamp-2">
                    {highlightTerms(item.snippet, terms)}
                  </p>
                ) : null}
                <div className="mt-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-light-fourth">
                  <span>{KIND_LABEL[item.kind]}</span>
                  {item.subtitle ? (
                    <span className="truncate normal-case tracking-normal opacity-70">
                      {item.subtitle}
                    </span>
                  ) : null}
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {searched && !pending && results.length === 0 ? (
        <p className="mt-8 text-sm text-light-fourth">
          Nothing matched “{query.trim()}”. Try fewer words, or drop the type
          filters.
        </p>
      ) : null}
    </div>
  );
}
