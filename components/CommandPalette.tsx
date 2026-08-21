"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/components/_compat";
import {
  Search,
  FileText,
  FolderGit2,
  Github,
  MapPin,
  Wrench,
  Briefcase,
  MessageSquare,
  CornerDownLeft,
} from "lucide-react";
import type { HitKind, SearchHit } from "@/lib/search-query";
import { KIND_LABEL, highlightTerms, queryTerms } from "@/components/search-ui";

function KindIcon({ kind }: { kind: HitKind }) {
  const cls = "w-3.5 h-3.5 text-light-fourth";
  switch (kind) {
    case "post":
      return <FileText className={cls} />;
    case "project":
      return <FolderGit2 className={cls} />;
    case "repo":
      return <Github className={cls} />;
    case "place":
      return <MapPin className={cls} />;
    case "tool":
      return <Wrench className={cls} />;
    case "experience":
      return <Briefcase className={cls} />;
    case "thought":
      return <MessageSquare className={cls} />;
  }
}

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return (el as HTMLElement).isContentEditable === true;
}

const KEYCAP =
  "grid h-5 min-w-[1.25rem] place-items-center rounded-[5px] px-1 text-[10px] font-medium text-light-fourth ring-1 ring-white/10 bg-white/[0.04] shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]";

const DEBOUNCE_MS = 140;

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [pending, setPending] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  const terms = useMemo(() => queryTerms(query), [query]);

  // One in-flight request at a time; a stale response never overwrites a newer
  // one, which is what makes fast typing feel stable.
  const run = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;

    setPending(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&limit=8`,
        {
          signal: controller.signal,
        },
      );
      if (!res.ok) return;
      const json = await res.json();
      if (seq !== seqRef.current) return;
      setResults(Array.isArray(json.items) ? (json.items as SearchHit[]) : []);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        console.error("[CommandPalette] search failed:", e);
      }
    } finally {
      if (seq === seqRef.current) setPending(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      run("");
      return;
    }
    const t = setTimeout(() => run(q), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, open, run]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "/" && !open) {
        if (isEditable(document.activeElement)) return;
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      return;
    }
    setQuery("");
    setSelectedIndex(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const row = listRef.current.querySelector<HTMLElement>(
      `[data-row-index="${selectedIndex}"]`,
    );
    if (row) row.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, results.length]);

  const navigate = useCallback(
    (item: SearchHit) => {
      setOpen(false);
      if (/^https?:\/\//i.test(item.href)) {
        window.open(item.href, "_blank", "noopener,noreferrer");
      } else {
        router.push(item.href);
      }
    },
    [router],
  );

  const seeAll = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }, [query, router]);

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Cmd-Enter always goes to the full results page.
      if (e.metaKey || e.ctrlKey) return seeAll();
      const item = results[selectedIndex];
      if (item) navigate(item);
      else seeAll();
    }
  }

  if (!open) return null;

  const hasQuery = query.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div className="fixed top-[15vh] left-1/2 -translate-x-1/2 w-[92%] max-w-xl rounded-xl ring-1 ring-white/10 bg-zinc-950 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-white/[0.06]">
          <Search className="w-4 h-4 text-light-fourth shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search posts, projects, places…"
            className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none py-4 text-base text-white placeholder:text-light-fourth"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search query"
          />
          <span className="flex shrink-0 items-center gap-1">
            <kbd className={KEYCAP}>⌘</kbd>
            <kbd className={KEYCAP}>K</kbd>
          </span>
        </div>

        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto divide-y divide-white/[0.04]"
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-sm text-light-fourth">
              {pending ? "Searching…" : hasQuery ? "No results." : "Loading…"}
            </div>
          ) : (
            results.map((item, idx) => {
              const selected = idx === selectedIndex;
              return (
                <button
                  key={`${item.kind}-${item.href}-${idx}`}
                  data-row-index={idx}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    navigate(item);
                  }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 ${
                    selected
                      ? "bg-accent-primary/10 text-white"
                      : "text-light-secondary"
                  }`}
                >
                  <span className="shrink-0">
                    <KindIcon kind={item.kind} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm truncate">
                      {highlightTerms(item.title, terms)}
                    </span>
                    {item.snippet ? (
                      <span className="block text-xs text-light-fourth truncate">
                        {highlightTerms(item.snippet, terms)}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider px-1.5 py-[2px] rounded ring-1 ring-white/[0.08] text-light-fourth">
                    {KIND_LABEL[item.kind]}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {hasQuery ? (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              seeAll();
            }}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 border-t border-white/[0.06] text-xs text-light-fourth hover:text-white"
          >
            <span>See all results for “{query.trim()}”</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
