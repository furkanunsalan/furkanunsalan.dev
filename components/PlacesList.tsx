"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  LayoutGrid,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { Place, PlaceStatus } from "@/types";
import { iconKey, type ListIconKey } from "@/lib/place-list-icons";
import { PLACE_LIST_ICON_COMPONENTS } from "@/lib/place-list-icons-react";

const PAGE_SIZE = 20;

// Status drives the per-row icon ring color (matches the map pins).
const STATUS_META: Record<
  PlaceStatus,
  {
    label: string;
    ring: string;
    chipBg: string;
    chipText: string;
    Icon: typeof Bookmark;
  }
> = {
  "want-to-go": {
    label: "Want to go",
    ring: "ring-accent-primary",
    chipBg: "bg-accent-primary/15",
    chipText: "text-accent-primary",
    Icon: Bookmark,
  },
  been: {
    label: "Been there",
    ring: "ring-emerald-500",
    chipBg: "bg-emerald-500/15",
    chipText: "text-emerald-400",
    Icon: Check,
  },
  favorite: {
    label: "Favorite",
    ring: "ring-rose-500",
    chipBg: "bg-rose-500/15",
    chipText: "text-rose-400",
    Icon: Heart,
  },
};

type StatusFilter = PlaceStatus | "all";
type ListFilter = string; // "" = all lists

interface ListMeta {
  name: string;
  icon: string;
}

interface Props {
  places: Place[];
  lists: ListMeta[];
  onSelect?: (slug: string) => void;
}

export default function PlacesList({ places, lists, onSelect }: Props) {
  const [activeList, setActiveList] = useState<ListFilter>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<null | "lists" | "status">(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: PointerEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenMenu(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const listCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of places) m.set(p.list || "", (m.get(p.list || "") || 0) + 1);
    return m;
  }, [places]);

  const statusCounts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: places.length,
      "want-to-go": 0,
      been: 0,
      favorite: 0,
    };
    for (const p of places) c[p.status]++;
    return c;
  }, [places]);

  const iconByList = useMemo(() => {
    const m = new Map<string, ListIconKey>();
    for (const l of lists) m.set(l.name, iconKey(l.icon));
    return m;
  }, [lists]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((p) => {
      if (activeList === "__none__") {
        if ((p.list || "") !== "") return false;
      } else if (activeList) {
        if ((p.list || "") !== activeList) return false;
      }
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (activeTag && !p.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.address || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q) ||
        (p.list || "").toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [places, activeList, statusFilter, query, activeTag]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const onList = (l: ListFilter) => {
    setActiveList(l);
    setPage(1);
  };
  const onStatus = (s: StatusFilter) => {
    setStatusFilter(s);
    setPage(1);
  };
  const onQuery = (s: string) => {
    setQuery(s);
    setPage(1);
  };
  const onTag = (t: string | null) => {
    setActiveTag(t);
    setPage(1);
  };

  const uncategorizedCount = listCounts.get("") ?? 0;

  return (
    <div>
      {/* Search + filters — single underlined bar with icon dropdowns */}
      <div ref={barRef} className="relative mb-4">
        <div className="flex items-center gap-2 border-b border-white/[0.1] pb-2 transition-colors duration-200 focus-within:border-accent-primary/50">
          <Search className="h-4 w-4 shrink-0 text-light-fourth" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search places, address…"
            className="flex-1 bg-transparent py-1 text-sm text-light-secondary placeholder:text-light-fourth focus:outline-none"
          />

          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === "lists" ? null : "lists")}
            aria-label="Filter by category"
            aria-expanded={openMenu === "lists"}
            title="Filter by category"
            className={`relative p-1 transition-colors ${
              activeList !== ""
                ? "text-accent-primary"
                : "text-light-fourth hover:text-white"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            {activeList !== "" && (
              <span className="absolute -right-0 -top-0 h-1.5 w-1.5 rounded-full bg-accent-primary" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === "status" ? null : "status")}
            aria-label="Filter by status"
            aria-expanded={openMenu === "status"}
            title="Filter by status"
            className={`relative p-1 transition-colors ${
              statusFilter !== "all"
                ? "text-accent-primary"
                : "text-light-fourth hover:text-white"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {statusFilter !== "all" && (
              <span className="absolute -right-0 -top-0 h-1.5 w-1.5 rounded-full bg-accent-primary" />
            )}
          </button>
        </div>

        {openMenu === "lists" && (
          <Menu>
            <MenuItem
              active={activeList === ""}
              onClick={() => {
                onList("");
                setOpenMenu(null);
              }}
            >
              All
              <span className="ml-auto tabular-nums text-light-fourth">
                {places.length}
              </span>
            </MenuItem>
            {lists.map((l) => {
              const ik = iconByList.get(l.name) ?? iconKey(l.icon);
              const Icon = PLACE_LIST_ICON_COMPONENTS[ik];
              const count = listCounts.get(l.name) ?? 0;
              return (
                <MenuItem
                  key={l.name}
                  active={activeList === l.name}
                  onClick={() => {
                    onList(l.name);
                    setOpenMenu(null);
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {l.name}
                  <span className="ml-auto tabular-nums text-light-fourth">
                    {count}
                  </span>
                </MenuItem>
              );
            })}
            {uncategorizedCount > 0 && (
              <MenuItem
                active={activeList === "__none__"}
                onClick={() => {
                  onList("__none__");
                  setOpenMenu(null);
                }}
              >
                Uncategorized
                <span className="ml-auto tabular-nums text-light-fourth">
                  {uncategorizedCount}
                </span>
              </MenuItem>
            )}
          </Menu>
        )}

        {openMenu === "status" && (
          <Menu>
            <MenuItem
              active={statusFilter === "all"}
              onClick={() => {
                onStatus("all");
                setOpenMenu(null);
              }}
            >
              All status
              <span className="ml-auto tabular-nums text-light-fourth">
                {statusCounts.all}
              </span>
            </MenuItem>
            {(Object.keys(STATUS_META) as PlaceStatus[]).map((s) => {
              const m = STATUS_META[s];
              return (
                <MenuItem
                  key={s}
                  active={statusFilter === s}
                  onClick={() => {
                    onStatus(s);
                    setOpenMenu(null);
                  }}
                >
                  <m.Icon className="h-3.5 w-3.5" />
                  {m.label}
                  <span className="ml-auto tabular-nums text-light-fourth">
                    {statusCounts[s]}
                  </span>
                </MenuItem>
              );
            })}
          </Menu>
        )}
      </div>

      {activeTag !== null && (
        <div className="mb-4 text-[11px] text-light-fourth inline-flex items-center gap-1.5">
          filtered by tag
          <button
            type="button"
            onClick={() => onTag(null)}
            className="rounded-full px-2 py-0.5 ring-1 bg-accent-primary/15 text-accent-primary ring-accent-primary/40 hover:bg-accent-primary/25 transition-colors"
          >
            {activeTag} ✕
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-6 text-sm text-light-fourth text-center">
          No places match.
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.04] ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950">
          {visible.map((p) => {
            const meta = STATUS_META[p.status];
            const ik = iconByList.get(p.list || "") ?? iconKey(null);
            const RowIcon = PLACE_LIST_ICON_COMPONENTS[ik];
            const handleRowActivate = () => onSelect?.(p.slug);
            return (
              <li
                key={p.slug}
                className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={handleRowActivate}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowActivate();
                  }
                }}
              >
                <span
                  aria-label={meta.label}
                  title={`${meta.label}${p.list ? ` · ${p.list}` : ""}`}
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full bg-black ring-2 ${meta.ring} text-white shrink-0`}
                >
                  <RowIcon className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{p.name}</div>
                  {(p.address || p.city) && (
                    <div className="text-xs text-light-fourth truncate">
                      {[p.address, p.city].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {(p.category || p.addedAt) && (
                    <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-light-fourth/70">
                      {p.category && <span>{p.category}</span>}
                      {p.category && p.addedAt && <span aria-hidden>·</span>}
                      {p.addedAt && (
                        <time dateTime={p.addedAt}>
                          {formatDate(p.addedAt)}
                        </time>
                      )}
                    </div>
                  )}
                  {p.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {p.tags.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTag(activeTag === t ? null : t);
                          }}
                          className={`rounded-full px-2 py-0.5 text-[10px] ring-1 transition-colors ${
                            activeTag === t
                              ? "bg-accent-primary/15 text-accent-primary ring-accent-primary/40"
                              : "ring-white/[0.06] text-light-fourth hover:text-white hover:ring-white/20"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {p.sourceUrl && (
                  <a
                    href={p.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-light-fourth hover:text-white transition-colors shrink-0 self-center"
                    aria-label="Open in Google Maps"
                    title="Open in Google Maps"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > PAGE_SIZE && (
        <nav className="mt-4 flex items-center justify-between text-xs text-light-fourth">
          <span>
            {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 ring-1 ring-white/[0.06] enabled:hover:ring-white/20 enabled:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <span className="px-2">
              {safePage} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={safePage >= pageCount}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 ring-1 ring-white/[0.06] enabled:hover:ring-white/20 enabled:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

function Menu({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute right-0 top-full z-30 mt-2 max-h-72 w-56 overflow-auto rounded-lg border border-white/10 bg-zinc-950 py-1 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.9)] animate-fade-in"
      style={{ animationDuration: "120ms" }}
    >
      {children}
    </div>
  );
}

function MenuItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-white/[0.05] ${
        active ? "text-accent-primary" : "text-light-secondary hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
