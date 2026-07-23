"use client";

import { Link } from "@/components/_compat";
import { useRouter } from "@/components/_compat";
import { useMemo, useState } from "react";
import {
  Search,
  MapPin,
  Trash2,
  Tag as TagIcon,
  List as ListIcon,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { ComboInput } from "@/components/admin/form";

type Status = "want-to-go" | "been" | "favorite";

export type PlaceRow = {
  slug: string;
  name: string;
  city: string;
  country: string;
  list: string;
  category: string;
  status: Status;
  tags: string[];
  addedAt: string | null;
  createdAt: string;
};

type ListMeta = { name: string; icon: string };

type SortKey =
  | "added-desc"
  | "added-asc"
  | "name-asc"
  | "name-desc"
  | "category-asc"
  | "list-asc";

const STATUS_LABEL: Record<Status, string> = {
  "want-to-go": "Want to go",
  been: "Been",
  favorite: "Favorite",
};

const STATUS_CHIP: Record<Status, string> = {
  "want-to-go":
    "bg-accent-primary/15 text-accent-primary ring-accent-primary/30",
  been: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  favorite: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
};

const PAGE_SIZE = 30;

export default function PlacesAdminEditor({
  rows: initial,
  lists,
  categories,
}: {
  rows: PlaceRow[];
  lists: ListMeta[];
  categories: string[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<PlaceRow[]>(initial);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [listFilter, setListFilter] = useState<string>("__all__");
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");
  const [sort, setSort] = useState<SortKey>("added-desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (listFilter === "__uncat__" && r.list !== "") return false;
      if (
        listFilter !== "__all__" &&
        listFilter !== "__uncat__" &&
        r.list !== listFilter
      )
        return false;
      if (categoryFilter === "__uncat__" && r.category !== "") return false;
      if (
        categoryFilter !== "__all__" &&
        categoryFilter !== "__uncat__" &&
        r.category !== categoryFilter
      )
        return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q) ||
        r.list.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
    return out.sort((a, b) => {
      switch (sort) {
        case "added-desc":
          return tsKey(b.addedAt, b.createdAt) - tsKey(a.addedAt, a.createdAt);
        case "added-asc":
          return tsKey(a.addedAt, a.createdAt) - tsKey(b.addedAt, b.createdAt);
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "category-asc":
          return (
            a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
          );
        case "list-asc":
          return a.list.localeCompare(b.list) || a.name.localeCompare(b.name);
      }
    });
  }, [rows, query, statusFilter, listFilter, categoryFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const allVisibleSelected =
    visible.length > 0 && visible.every((r) => selected.has(r.slug));

  function toggle(slug: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }
  function toggleAllVisible() {
    setSelected((cur) => {
      const next = new Set(cur);
      if (allVisibleSelected) {
        for (const r of visible) next.delete(r.slug);
      } else {
        for (const r of visible) next.add(r.slug);
      }
      return next;
    });
  }
  function clearSelection() {
    setSelected(new Set());
  }

  async function runBulk(
    action:
      "delete" | "set-category" | "set-list" | "clear-list" | "set-status",
    value?: string,
    confirmMsg?: string,
  ) {
    if (busy) return;
    const slugs = Array.from(selected);
    if (slugs.length === 0) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/places/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slugs, action, value }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || `error ${res.status}`);
        return;
      }
      if (action === "delete") {
        setRows((cur) => cur.filter((r) => !selected.has(r.slug)));
      } else {
        setRows((cur) =>
          cur.map((r) => {
            if (!selected.has(r.slug)) return r;
            if (action === "set-category")
              return { ...r, category: value || "" };
            if (action === "set-list") return { ...r, list: value || "" };
            if (action === "clear-list") return { ...r, list: "" };
            if (action === "set-status")
              return { ...r, status: value as Status };
            return r;
          }),
        );
      }
      clearSelection();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-light-fourth" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, slug, city, category, tag…"
            className="w-full bg-zinc-950 ring-1 ring-white/[0.06] focus:ring-white/20 outline-none rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-light-fourth"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-zinc-950 ring-1 ring-white/[0.06] focus:ring-white/20 outline-none rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="added-desc">Newest first</option>
          <option value="added-asc">Oldest first</option>
          <option value="name-asc">Name A→Z</option>
          <option value="name-desc">Name Z→A</option>
          <option value="category-asc">Category</option>
          <option value="list-asc">List</option>
        </select>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v as Status | "all");
            setPage(1);
          }}
          options={[
            { value: "all", label: "All status" },
            { value: "want-to-go", label: "Want to go" },
            { value: "been", label: "Been" },
            { value: "favorite", label: "Favorite" },
          ]}
        />
        <FilterSelect
          label="List"
          value={listFilter}
          onChange={(v) => {
            setListFilter(v);
            setPage(1);
          }}
          options={[
            { value: "__all__", label: "All lists" },
            { value: "__uncat__", label: "Uncategorized" },
            ...lists.map((l) => ({ value: l.name, label: l.name })),
          ]}
        />
        <FilterSelect
          label="Category"
          value={categoryFilter}
          onChange={(v) => {
            setCategoryFilter(v);
            setPage(1);
          }}
          options={[
            { value: "__all__", label: "All categories" },
            { value: "__uncat__", label: "Uncategorized" },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
        />
        <div className="ml-auto text-xs text-light-fourth">
          {filtered.length} match{filtered.length === 1 ? "" : "es"}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          lists={lists}
          categories={categories}
          busy={busy}
          onClear={clearSelection}
          onDelete={() =>
            runBulk(
              "delete",
              undefined,
              `Delete ${selected.size} place(s)? This cannot be undone.`,
            )
          }
          onSetCategory={(v) => runBulk("set-category", v)}
          onSetList={(v) =>
            v === "__clear__" ? runBulk("clear-list") : runBulk("set-list", v)
          }
          onSetStatus={(v) => runBulk("set-status", v)}
        />
      )}

      {error && <div className="text-xs text-rose-400">{error}</div>}

      <div className="ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950">
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-light-fourth border-b border-white/[0.06]">
          <button
            type="button"
            onClick={toggleAllVisible}
            className="text-light-fourth hover:text-white"
            aria-label="toggle all"
          >
            {allVisibleSelected ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
          <span className="flex-1">Place</span>
          <span className="hidden sm:block w-32">List</span>
          <span className="hidden sm:block w-32">Category</span>
          <span className="w-24 text-right">Status</span>
        </div>

        <ul className="divide-y divide-white/[0.04]">
          {visible.length === 0 && (
            <li className="px-4 py-6 text-sm text-light-fourth text-center">
              No places match.
            </li>
          )}
          {visible.map((r) => {
            const isSel = selected.has(r.slug);
            return (
              <li
                key={r.slug}
                className={`px-4 py-3 flex items-center gap-3 transition-colors ${
                  isSel ? "bg-accent-primary/[0.05]" : "hover:bg-white/[0.03]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(r.slug)}
                  className="text-light-fourth hover:text-white"
                  aria-label="toggle"
                >
                  {isSel ? (
                    <CheckSquare className="w-4 h-4 text-accent-primary" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
                <Link
                  href={`/admin/places/${encodeURIComponent(r.slug)}`}
                  className="flex-1 min-w-0 flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-light-fourth shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate">{r.name}</div>
                    <div className="text-xs text-light-fourth truncate">
                      {[r.city, r.country].filter(Boolean).join(" · ") || "—"}
                    </div>
                    {r.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="rounded-full px-2 py-0.5 text-[10px] ring-1 ring-white/[0.06] text-light-fourth"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
                <span className="hidden sm:block w-32 text-xs text-light-secondary truncate">
                  {r.list || <span className="text-light-fourth">—</span>}
                </span>
                <span className="hidden sm:block w-32 text-xs text-light-secondary truncate">
                  {r.category || <span className="text-light-fourth">—</span>}
                </span>
                <span
                  className={`w-24 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 shrink-0 text-center ${STATUS_CHIP[r.status]}`}
                >
                  {STATUS_LABEL[r.status]}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {filtered.length > PAGE_SIZE && (
        <nav className="flex items-center justify-between text-xs text-light-fourth pt-1">
          <span>
            {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="rounded-md px-2 py-1 ring-1 ring-white/[0.06] enabled:hover:ring-white/20 enabled:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="px-2">
              {safePage} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={safePage >= pageCount}
              className="rounded-md px-2 py-1 ring-1 ring-white/[0.06] enabled:hover:ring-white/20 enabled:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-light-fourth">
      <span>{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-950 ring-1 ring-white/[0.06] focus:ring-white/20 outline-none rounded-md px-2 py-1 text-xs text-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function BulkBar({
  count,
  lists,
  categories,
  busy,
  onClear,
  onDelete,
  onSetCategory,
  onSetList,
  onSetStatus,
}: {
  count: number;
  lists: ListMeta[];
  categories: string[];
  busy: boolean;
  onClear: () => void;
  onDelete: () => void;
  onSetCategory: (v: string) => void;
  onSetList: (v: string) => void;
  onSetStatus: (v: Status) => void;
}) {
  const [draftCategory, setDraftCategory] = useState("");
  return (
    <div className="sticky top-12 z-10 rounded-lg ring-1 ring-accent-primary/30 bg-accent-primary/[0.07] backdrop-blur px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-accent-primary">{count} selected</span>

      <span className="text-light-fourth">·</span>

      <div className="inline-flex items-center gap-1">
        <TagIcon className="w-3.5 h-3.5 text-light-fourth" />
        <span className="text-light-fourth">Category:</span>
        <div className="w-44">
          <ComboInput
            value={draftCategory}
            onChange={setDraftCategory}
            options={categories}
            placeholder="cafe, bar…"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            onSetCategory(draftCategory.trim());
            setDraftCategory("");
          }}
          disabled={busy}
          className="rounded-md px-2 py-1 text-[11px] ring-1 ring-white/10 hover:ring-white/30 text-white disabled:opacity-50"
        >
          Apply
        </button>
      </div>

      <span className="text-light-fourth">·</span>

      <label className="inline-flex items-center gap-1">
        <ListIcon className="w-3.5 h-3.5 text-light-fourth" />
        <span className="text-light-fourth">List:</span>
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            onSetList(v);
            e.currentTarget.value = "";
          }}
          disabled={busy}
          className="bg-zinc-950 ring-1 ring-white/10 focus:ring-white/30 outline-none rounded-md px-2 py-1 text-[11px] text-white"
        >
          <option value="">Set to…</option>
          <option value="__clear__">— none —</option>
          {lists.map((l) => (
            <option key={l.name} value={l.name}>
              {l.name}
            </option>
          ))}
        </select>
      </label>

      <span className="text-light-fourth">·</span>

      <label className="inline-flex items-center gap-1">
        <span className="text-light-fourth">Status:</span>
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            onSetStatus(v as Status);
            e.currentTarget.value = "";
          }}
          disabled={busy}
          className="bg-zinc-950 ring-1 ring-white/10 focus:ring-white/30 outline-none rounded-md px-2 py-1 text-[11px] text-white"
        >
          <option value="">Set to…</option>
          <option value="want-to-go">Want to go</option>
          <option value="been">Been</option>
          <option value="favorite">Favorite</option>
        </select>
      </label>

      <span className="ml-auto inline-flex items-center gap-1">
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ring-1 ring-rose-500/40 text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={busy}
          className="rounded-md p-1 text-light-fourth hover:text-white"
          aria-label="clear selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </span>
    </div>
  );
}

function tsKey(addedAt: string | null, createdAt: string): number {
  const t = addedAt ? Date.parse(addedAt) : NaN;
  if (!Number.isNaN(t)) return t;
  return Date.parse(createdAt) || 0;
}
