"use client";

import { useRouter } from "@/components/_compat";
import { useMemo, useState } from "react";
import {
  Briefcase,
  CheckSquare,
  FolderGit2,
  MapPin,
  MessageSquare,
  PenLine,
  RotateCcw,
  Square,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

export type TrashCollection =
  "posts" | "projects" | "experiences" | "tools" | "places" | "thoughts";

export type TrashRow = {
  collection: TrashCollection;
  id: string;
  label: string;
  deletedAt: string;
};

const COLLECTION_ICON: Record<TrashCollection, typeof PenLine> = {
  posts: PenLine,
  projects: FolderGit2,
  experiences: Briefcase,
  tools: Wrench,
  places: MapPin,
  thoughts: MessageSquare,
};

const COLLECTION_LABEL: Record<TrashCollection, string> = {
  posts: "Post",
  projects: "Project",
  experiences: "Experience",
  tools: "Tool",
  places: "Place",
  thoughts: "Thought",
};

function rowKey(r: TrashRow): string {
  return `${r.collection}:${r.id}`;
}

function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const sec = Math.max(1, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}

export default function TrashEditor({ rows: initial }: { rows: TrashRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<TrashRow[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => selected.has(rowKey(r))),
    [rows, selected],
  );

  function toggle(r: TrashRow) {
    setSelected((cur) => {
      const next = new Set(cur);
      const k = rowKey(r);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }
  function toggleAll() {
    setSelected((cur) => {
      if (allSelected) return new Set();
      const next = new Set(cur);
      for (const r of rows) next.add(rowKey(r));
      return next;
    });
  }
  function clearSelection() {
    setSelected(new Set());
  }

  async function run(
    kind: "restore" | "purge",
    targets: TrashRow[],
    confirmMsg?: string,
  ) {
    if (busy || targets.length === 0) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/trash/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: targets.map((t) => ({ collection: t.collection, id: t.id })),
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || `error ${res.status}`);
        return;
      }
      const removed = new Set(targets.map(rowKey));
      setRows((cur) => cur.filter((r) => !removed.has(rowKey(r))));
      setSelected((cur) => {
        const next = new Set(cur);
        for (const k of removed) next.delete(k);
        return next;
      });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(rowKey(r))),
    [rows, selected],
  );

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="sticky top-12 z-10 rounded-lg ring-1 ring-accent-primary/30 bg-accent-primary/[0.07] backdrop-blur px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-accent-primary">
            {selected.size} selected
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => run("restore", selectedRows)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ring-1 ring-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore selected
            </button>
            <button
              type="button"
              onClick={() =>
                run(
                  "purge",
                  selectedRows,
                  `Permanently delete ${selected.size} item(s)? This cannot be undone.`,
                )
              }
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ring-1 ring-rose-500/40 text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Purge selected
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={busy}
              className="rounded-md p-1 text-light-fourth hover:text-white"
              aria-label="clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      {error && <div className="text-xs text-rose-400">{error}</div>}

      <div className="ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950">
        <div className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-light-fourth border-b border-white/[0.06]">
          <button
            type="button"
            onClick={toggleAll}
            disabled={rows.length === 0}
            className="text-light-fourth hover:text-white disabled:opacity-40"
            aria-label="toggle all"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
          <span className="w-20">Type</span>
          <span className="flex-1">Item</span>
          <span className="hidden sm:block w-32 text-right">Deleted</span>
          <span className="w-28 text-right">Actions</span>
        </div>

        <ul className="divide-y divide-white/[0.04]">
          {rows.length === 0 && (
            <li className="px-4 py-6 text-sm text-light-fourth text-center">
              Trash is empty.
            </li>
          )}
          {rows.map((r) => {
            const k = rowKey(r);
            const isSel = selected.has(k);
            const Icon = COLLECTION_ICON[r.collection];
            return (
              <li
                key={k}
                className={`px-4 py-3 flex items-center gap-3 transition-colors ${
                  isSel ? "bg-accent-primary/[0.05]" : "hover:bg-white/[0.03]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(r)}
                  className="text-light-fourth hover:text-white"
                  aria-label="toggle"
                >
                  {isSel ? (
                    <CheckSquare className="w-4 h-4 text-accent-primary" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
                <span className="w-20 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-light-fourth">
                  <Icon className="w-3.5 h-3.5" />
                  {COLLECTION_LABEL[r.collection]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{r.label}</div>
                  <div className="text-[11px] text-light-fourth truncate font-mono">
                    {r.id}
                  </div>
                </div>
                <time
                  dateTime={r.deletedAt}
                  className="hidden sm:block w-32 text-right text-xs text-light-fourth tabular-nums"
                  title={r.deletedAt}
                >
                  {relativeTime(r.deletedAt)}
                </time>
                <div className="w-28 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => run("restore", [r])}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ring-1 ring-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                    aria-label="restore"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      run(
                        "purge",
                        [r],
                        `Permanently delete "${r.label}"? This cannot be undone.`,
                      )
                    }
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ring-1 ring-rose-500/30 text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
                    aria-label="purge"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
