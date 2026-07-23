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
} from "lucide-react";

type Kind =
  "post" | "project" | "repo" | "place" | "tool" | "experience" | "thought";

type SearchItem = {
  kind: Kind;
  title: string;
  snippet: string;
  href: string;
  date?: string;
};

const KIND_LABEL: Record<Kind, string> = {
  post: "POST",
  project: "PROJECT",
  repo: "REPO",
  place: "PLACE",
  tool: "TOOL",
  experience: "EXPERIENCE",
  thought: "THOUGHT",
};

function KindIcon({ kind }: { kind: Kind }) {
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

// Subsequence-match scorer. Higher score = better. Returns -Infinity for misses.
function scoreItem(query: string, item: SearchItem): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const title = item.title.toLowerCase();
  const snippet = item.snippet.toLowerCase();

  const sub = (haystack: string) => {
    let i = 0;
    let score = 0;
    let streak = 0;
    let prevIdx = -1;
    for (const ch of q) {
      const found = haystack.indexOf(ch, i);
      if (found === -1) return null;
      if (found === prevIdx + 1) {
        streak += 1;
        score += 2 + streak;
      } else {
        streak = 0;
        score += 1;
      }
      if (found === 0) score += 3;
      prevIdx = found;
      i = found + 1;
    }
    return score;
  };

  const titleScore = sub(title);
  const snippetScore = sub(snippet);

  if (titleScore === null && snippetScore === null) return -Infinity;

  let total = 0;
  if (titleScore !== null) total += titleScore * 4;
  if (snippetScore !== null) total += snippetScore * 1;

  if (title === q) total += 100;
  else if (title.startsWith(q)) total += 30;
  else if (title.includes(q)) total += 15;

  return total;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent text-white font-medium">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const itemsRef = useRef<SearchItem[] | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const loadIndex = useCallback(async () => {
    if (itemsRef.current) return;
    try {
      const res = await fetch("/api/search", { cache: "force-cache" });
      if (!res.ok) return;
      const json = await res.json();
      if (json && Array.isArray(json.items)) {
        itemsRef.current = json.items as SearchItem[];
        setLoaded(true);
      }
    } catch (e) {
      console.error("[CommandPalette] index fetch failed:", e);
    }
  }, []);

  useEffect(() => {
    loadIndex();
  }, [loadIndex]);

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
    if (open) {
      loadIndex();
      setQuery("");
      setSelectedIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open, loadIndex]);

  const results = useMemo<SearchItem[]>(() => {
    const all = itemsRef.current || [];
    const q = query.trim();
    if (!q) {
      const withDate = all
        .filter((i) => i.kind === "post" || i.kind === "thought")
        .filter((i) => i.date)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      return withDate.slice(0, 5);
    }
    const scored = all
      .map((item) => ({ item, score: scoreItem(q, item) }))
      .filter((s) => s.score > -Infinity)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((s) => s.item);
    return scored;
  }, [query, loaded]);

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
    (item: SearchItem) => {
      setOpen(false);
      if (/^https?:\/\//i.test(item.href)) {
        window.open(item.href, "_blank", "noopener,noreferrer");
      } else {
        router.push(item.href);
      }
    },
    [router],
  );

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[selectedIndex];
      if (item) navigate(item);
    }
  }

  if (!open) return null;

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
          />
          <kbd className="text-[10px] uppercase tracking-wider text-light-fourth ring-1 ring-white/10 rounded px-1.5 py-[2px]">
            ⌘K
          </kbd>
        </div>

        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto divide-y divide-white/[0.04]"
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-sm text-light-fourth">
              {itemsRef.current === null ? "Loading…" : "No results."}
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
                      {highlight(item.title, query)}
                    </span>
                    {item.snippet ? (
                      <span className="block text-xs text-light-fourth truncate">
                        {highlight(item.snippet, query)}
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
      </div>
    </div>
  );
}
