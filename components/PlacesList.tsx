"use client";

import { useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  Search,
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
      {/* Top row — list filter chips with icons */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <ListChip
          active={activeList === ""}
          onClick={() => onList("")}
          label="All"
          count={places.length}
        />
        {lists.map((l) => {
          const ik = iconByList.get(l.name) ?? iconKey(l.icon);
          const Icon = PLACE_LIST_ICON_COMPONENTS[ik];
          const count = listCounts.get(l.name) ?? 0;
          return (
            <ListChip
              key={l.name}
              active={activeList === l.name}
              onClick={() => onList(activeList === l.name ? "" : l.name)}
              label={l.name}
              count={count}
              Icon={Icon}
            />
          );
        })}
        {uncategorizedCount > 0 && (
          <ListChip
            active={activeList === "__none__"}
            onClick={() => onList(activeList === "__none__" ? "" : "__none__")}
            label="Uncategorized"
            count={uncategorizedCount}
          />
        )}
      </div>

      {/* Second row — search + status filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-light-fourth" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search places, address, city, tag…"
            className="w-full bg-zinc-950 ring-1 ring-white/[0.06] focus:ring-white/20 outline-none rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-light-fourth"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={statusFilter === "all"}
            onClick={() => onStatus("all")}
            label="All status"
            count={statusCounts.all}
          />
          {(Object.keys(STATUS_META) as PlaceStatus[]).map((s) => {
            const m = STATUS_META[s];
            return (
              <FilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => onStatus(s)}
                label={m.label}
                count={statusCounts[s]}
                accent={`${m.chipBg} ${m.chipText} ${m.ring}/40`}
                Icon={m.Icon}
              />
            );
          })}
        </div>
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

function ListChip({
  active,
  onClick,
  label,
  count,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  Icon?: typeof Bookmark;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ring-1 transition-colors ${
        active
          ? "bg-accent-primary/15 text-accent-primary ring-accent-primary/40"
          : "ring-white/[0.06] text-light-secondary hover:text-white hover:ring-white/20"
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span className="font-medium">{label}</span>
      <span className="opacity-60">{count}</span>
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  accent,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  accent?: string;
  Icon?: typeof Bookmark;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ring-1 transition-colors ${
        active
          ? accent
            ? `${accent} ring-1`
            : "bg-white/10 text-white ring-white/20"
          : "ring-white/[0.06] text-light-fourth hover:text-white hover:ring-white/20"
      }`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {label}
      <span className="opacity-70">· {count}</span>
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
