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
import {
  ALL_KINDS,
  nextSelectedIndex,
  searchStatusText,
  toggleKind,
  type HitKind,
  type SearchHit,
} from "@/lib/search-query";
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

export type SearchVariant = "modal" | "page";

type Props = {
  /** "page" is the server-rendered fallback behind /search: it keeps the page
   *  chrome (heading, no-JS GET form) and prompts instead of listing recent
   *  content. "modal" drops the chrome and shows recent content while the box
   *  is empty. Both share this one body so the results never drift apart. */
  variant?: SearchVariant;
  initialQuery?: string;
  initialResults?: SearchHit[];
  /** Focus the field on mount. The modal focuses its own input instead. */
  autoFocus?: boolean;
  /** Fired when a result is activated, before the browser navigates; the modal
   *  uses it to start closing so a click never flashes the page underneath. */
  onActivate?: (item: SearchHit) => void;
};

export default function SearchResults({
  variant = "page",
  initialQuery = "",
  initialResults = [],
  autoFocus = false,
  onActivate,
}: Props) {
  const isModal = variant === "modal";
  const pad = isModal ? "px-4" : "";
  const [query, setQuery] = useState(initialQuery);
  const [kinds, setKinds] = useState<HitKind[]>([]);
  const [results, setResults] = useState<SearchHit[]>(initialResults);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(initialQuery.trim().length > 0);
  const [selected, setSelected] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  // The page variant is server-rendered, so its first query is already on
  // screen and must not be repeated on mount. The modal has no server pass and
  // fetches on open.
  const primed = useRef(false);

  const terms = useMemo(() => queryTerms(query), [query]);

  const run = useCallback(
    async (q: string, activeKinds: HitKind[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const seq = ++seqRef.current;

      // An empty box is a real state in the modal (recent content) but a blank
      // prompt on the page, so only the page short-circuits it.
      if (!q.trim() && !isModal) {
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
        setResults(
          Array.isArray(json.items) ? (json.items as SearchHit[]) : [],
        );
        setSearched(true);
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") {
          console.error("[SearchResults] search failed:", e);
        }
      } finally {
        if (seq === seqRef.current) setPending(false);
      }
    },
    [isModal],
  );

  useEffect(() => {
    if (!primed.current) {
      primed.current = true;
      // No debounce on open: a deep link's query, or the recent list, should
      // land as soon as the modal settles in.
      if (isModal) run(query, kinds);
      return;
    }
    const t = setTimeout(() => run(query, kinds), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, kinds, run, isModal]);

  // Keep /search shareable without pushing a history entry per keystroke — but
  // only there. Elsewhere the modal is a layer, and rewriting ?q= would leak
  // the query into an unrelated page's URL.
  useEffect(() => {
    if (isModal && window.location.pathname === "/search") {
      const url = new URL(window.location.href);
      if (query.trim()) url.searchParams.set("q", query.trim());
      else url.searchParams.delete("q");
      window.history.replaceState({}, "", url);
    }
  }, [query, isModal]);

  useEffect(() => setSelected(0), [query, kinds]);

  // Follow the keyboard selection so an off-screen row scrolls into view.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-row-index="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected, results.length]);

  const activate = useCallback(
    (item: SearchHit, newTab = false) => {
      onActivate?.(item);
      const external = /^https?:\/\//i.test(item.href);
      if (external || newTab) {
        window.open(item.href, "_blank", "noopener,noreferrer");
      } else {
        window.location.assign(item.href);
      }
    },
    [onActivate],
  );

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => nextSelectedIndex(i, 1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => nextSelectedIndex(i, -1, results.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[selected];
      if (item) activate(item, e.metaKey || e.ctrlKey);
    }
  }

  const counts = useMemo(() => {
    const map = new Map<HitKind, number>();
    for (const r of results) map.set(r.kind, (map.get(r.kind) || 0) + 1);
    return map;
  }, [results]);

  const status = searchStatusText({
    pending,
    query,
    searched,
    count: results.length,
    recent: isModal,
  });

  const field = (
    <div
      className={`flex items-center gap-3 ${pad} border-b border-white/[0.08] focus-within:border-white/25 transition-colors`}
    >
      <Search className="w-5 h-5 text-light-fourth shrink-0" />
      <input
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onInputKeyDown}
        placeholder="Search writing, projects, places, gadgets…"
        className="flex-1 bg-transparent border-0 outline-none focus:outline-none py-3 text-xl text-white placeholder:text-light-fourth"
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        aria-label="Search query"
      />
    </div>
  );

  return (
    <div
      className={
        isModal
          ? "flex flex-col"
          : "max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 mb-16"
      }
    >
      {!isModal && (
        <h1 className="text-2xl font-bold text-white mb-6">Search</h1>
      )}

      {isModal ? (
        // The modal has no page to submit to; role="search" alone keeps the
        // landmark for assistive tech.
        <div role="search">{field}</div>
      ) : (
        // Plain GET form so the page still works with JS disabled.
        <form
          method="get"
          action="/search"
          onSubmit={(e) => e.preventDefault()}
          role="search"
        >
          {field}
        </form>
      )}

      <div
        className={`${pad} ${
          isModal ? "max-h-[55vh] overflow-y-auto pb-4" : ""
        }`}
      >
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
                onClick={() => setKinds((prev) => toggleKind(prev, kind))}
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
          {status}
        </p>

        <div ref={listRef} className="mt-4 space-y-1">
          {results.map((item, idx) => {
            const Icon = ICONS[item.kind];
            const external = /^https?:\/\//i.test(item.href);
            const active = idx === selected;
            // The highlight is its own rounded surface rather than a full-bleed
            // band: -mx-3 px-3 gives the fill breathing room while the text
            // stays on the container's original left edge, and the hairline ring
            // replaces the divider the list used to lean on — a divider can't
            // coexist with a rounded hover without showing through its corners.
            return (
              <a
                key={`${item.kind}-${item.href}-${idx}`}
                href={item.href}
                data-row-index={idx}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                onMouseEnter={() => setSelected(idx)}
                onClick={() => onActivate?.(item)}
                className={`group -mx-3 flex gap-4 rounded-xl px-3 py-3 transition-[background-color,box-shadow,color] duration-200 ${
                  active
                    ? "bg-white/[0.055] ring-1 ring-white/[0.08]"
                    : "ring-1 ring-transparent hover:bg-white/[0.055] hover:ring-white/[0.08]"
                }`}
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

        {searched &&
        !pending &&
        query.trim().length > 0 &&
        results.length === 0 ? (
          <p className="mt-8 text-sm text-light-fourth">
            Nothing matched “{query.trim()}”. Try fewer words, or drop the type
            filters.
          </p>
        ) : null}
      </div>
    </div>
  );
}
