"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Link2, Trash2, Loader2, ExternalLink } from "lucide-react";

type FileEntry = {
  name: string;
  url: string;
  size?: number;
  mtime?: string;
};

type ListResponse = {
  ok: true;
  target: string;
  dirs: Record<string, FileEntry[]>;
};

type RowRef = {
  collection: "posts" | "projects" | "experiences" | "thoughts" | "places";
  id: string;
  title?: string;
  field: "content" | "banner" | "image" | "images" | "body";
};

type FileWithRefs = {
  dir: string;
  name: string;
  url: string;
  refs: RowRef[];
};

type UsageResponse = {
  ok: true;
  target: string;
  fileRefs: FileWithRefs[];
  orphans: { dir: string; name: string; url: string }[];
};

const DIRS = [
  "posts",
  "projects",
  "experiences",
  "places",
  "thoughts",
  "misc",
] as const;
type Dir = (typeof DIRS)[number];
type Tab = "all" | Dir | "orphans";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "posts", label: "posts" },
  { id: "projects", label: "projects" },
  { id: "experiences", label: "experiences" },
  { id: "places", label: "places" },
  { id: "thoughts", label: "thoughts" },
  { id: "misc", label: "misc" },
  { id: "orphans", label: "Orphans" },
];

function fmtSize(n?: number): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fmtMtime(s?: string): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 16).replace("T", " ");
}

function adminHref(r: RowRef): string | null {
  switch (r.collection) {
    case "posts":
      return `/admin/posts/${encodeURIComponent(r.id)}`;
    case "thoughts":
      return `/admin/thoughts/${encodeURIComponent(r.id)}`;
    case "projects":
      return `/admin/projects/${encodeURIComponent(r.id)}`;
    case "experiences":
      return `/admin/experiences/${encodeURIComponent(r.id)}`;
    case "places":
      return `/admin/places/${encodeURIComponent(r.id)}`;
    default:
      return null;
  }
}

type Flat = FileEntry & { dir: Dir; refs: RowRef[] };

export default function UploadsLibrary() {
  const [list, setList] = useState<ListResponse | null>(null);
  const [refs, setRefs] = useState<Map<string, RowRef[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lr, ur] = await Promise.all([
          fetch("/api/admin/uploads/list", { cache: "no-store" }),
          fetch("/api/admin/uploads/usage", { cache: "no-store" }),
        ]);
        const lj = (await lr.json()) as ListResponse | { error: string };
        const uj = (await ur.json()) as UsageResponse | { error: string };
        if (cancelled) return;
        if (!lr.ok || !("ok" in lj)) {
          setError(("error" in lj && lj.error) || `HTTP ${lr.status}`);
          return;
        }
        setList(lj);
        if (ur.ok && "ok" in uj) {
          const m = new Map<string, RowRef[]>();
          for (const f of uj.fileRefs) m.set(`${f.dir}/${f.name}`, f.refs);
          setRefs(m);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      all: 0,
      posts: 0,
      projects: 0,
      experiences: 0,
      places: 0,
      thoughts: 0,
      misc: 0,
      orphans: 0,
    };
    if (!list) return c;
    for (const d of DIRS) {
      const arr = list.dirs[d] || [];
      c[d] = arr.length;
      c.all += arr.length;
      for (const f of arr) {
        const r = refs.get(`${d}/${f.name}`) || [];
        if (r.length === 0) c.orphans += 1;
      }
    }
    return c;
  }, [list, refs]);

  const flat: Flat[] = useMemo(() => {
    if (!list) return [];
    const wantDirs: Dir[] =
      tab === "all" || tab === "orphans" ? [...DIRS] : [tab];
    const out: Flat[] = [];
    for (const d of wantDirs) {
      for (const f of list.dirs[d] || []) {
        const r = refs.get(`${d}/${f.name}`) || [];
        if (tab === "orphans" && r.length > 0) continue;
        out.push({ ...f, dir: d, refs: r });
      }
    }
    if (tab === "all" || tab === "orphans") {
      out.sort((a, b) => {
        if (a.mtime && b.mtime)
          return a.mtime < b.mtime ? 1 : a.mtime > b.mtime ? -1 : 0;
        if (a.mtime) return -1;
        if (b.mtime) return 1;
        return a.name.localeCompare(b.name);
      });
    }
    return out;
  }, [list, refs, tab]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1500);
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(label);
    } catch {
      flash("copy failed");
    }
  }

  async function onDelete(item: Flat) {
    const ok = window.confirm(`Delete ${item.name}? Cannot be undone.`);
    if (!ok) return;
    const key = `${item.dir}/${item.name}`;
    setBusyKey(key);
    try {
      const r = await fetch("/api/admin/uploads/file", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dir: item.dir, name: item.name }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.error) {
        flash(j.error || `delete failed (${r.status})`);
        return;
      }
      setList((prev) =>
        prev
          ? {
              ...prev,
              dirs: {
                ...prev.dirs,
                [item.dir]: (prev.dirs[item.dir] || []).filter(
                  (f) => f.name !== item.name,
                ),
              },
            }
          : prev,
      );
      setRefs((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      flash("deleted");
      setOpenKey(null);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="relative">
      <div className="mb-3 text-[10px] font-mono uppercase tracking-wider text-light-fourth/80 break-all">
        target: {list?.target ?? (loading ? "…" : "?")}
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-white/[0.06] overflow-x-auto">
        {TABS.map((t) => {
          const isActive = tab === t.id;
          const isOrphans = t.id === "orphans";
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setOpenKey(null);
              }}
              className={`relative -mb-px px-3 py-2 text-xs whitespace-nowrap transition-colors ${
                isActive
                  ? `text-white border-b-2 ${isOrphans ? "border-rose-400" : "border-accent-primary"}`
                  : "text-light-fourth hover:text-white border-b-2 border-transparent"
              }`}
            >
              {t.label}{" "}
              <span
                className={`tabular-nums opacity-60 ${
                  isOrphans && counts.orphans > 0
                    ? "text-rose-300 opacity-100"
                    : ""
                }`}
              >
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-light-fourth py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}

      {error && (
        <div className="rounded-lg ring-1 ring-red-500/30 bg-red-500/10 text-red-300 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {!loading && !error && flat.length === 0 && (
        <div className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 px-4 py-8 text-center text-sm text-light-fourth">
          {tab === "orphans"
            ? "No orphaned files — everything is referenced."
            : "No files in this view."}
        </div>
      )}

      {!loading && !error && flat.length > 0 && (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          }}
        >
          {flat.map((item) => {
            const key = `${item.dir}/${item.name}`;
            const isOpen = openKey === key;
            const md = `![${item.name}](${item.url})`;
            const refCount = item.refs.length;
            const orphan = refCount === 0;
            return (
              <div
                key={key}
                className={`rounded-xl ring-1 bg-zinc-950 overflow-hidden transition-colors ${
                  isOpen
                    ? "ring-accent-primary/40"
                    : orphan
                      ? "ring-rose-500/15 hover:ring-rose-500/35"
                      : "ring-white/[0.06] hover:ring-white/[0.12]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenKey(isOpen ? null : key)}
                  className="block w-full text-left"
                >
                  <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
                    <img
                      src={item.url}
                      alt={item.name}
                      loading="lazy"
                      className="max-w-full max-h-full object-contain"
                    />
                    <span
                      className={`absolute top-1 right-1 inline-flex items-center rounded-full px-1.5 py-[1px] text-[9px] uppercase tracking-wider tabular-nums ring-1 ${
                        orphan
                          ? "bg-rose-500/20 text-rose-300 ring-rose-500/40"
                          : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                      }`}
                      title={
                        orphan
                          ? "Unreferenced — would be deleted by sweep"
                          : `${refCount} reference${refCount === 1 ? "" : "s"}`
                      }
                    >
                      {orphan
                        ? "orphan"
                        : `${refCount} ref${refCount === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  <div className="px-2 py-1.5">
                    <div
                      className="text-[10px] font-mono text-white/90 truncate"
                      title={item.name}
                    >
                      {item.name}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[9px] uppercase tracking-wider text-light-fourth/80">
                      <span>{item.dir}</span>
                      <span className="tabular-nums">{fmtSize(item.size)}</span>
                    </div>
                    {item.mtime && (
                      <div className="text-[9px] text-light-fourth/60 tabular-nums">
                        {fmtMtime(item.mtime)}
                      </div>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-white/[0.06] p-2 flex flex-col gap-1.5">
                    {item.refs.length > 0 && (
                      <div className="mb-1">
                        <div className="text-[9px] uppercase tracking-wider text-light-fourth/70 mb-1">
                          References
                        </div>
                        <ul className="space-y-0.5">
                          {item.refs.map((r, i) => {
                            const href = adminHref(r);
                            const label = r.title
                              ? `${r.title}`
                              : `${r.collection}:${r.id}`;
                            return (
                              <li key={i}>
                                {href ? (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[11px] text-light-secondary hover:text-accent-primary truncate"
                                    title={`${r.collection}.${r.field}`}
                                  >
                                    <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                                    <span className="truncate">{label}</span>
                                    <span className="ml-auto text-[9px] uppercase tracking-wider text-light-fourth/60 shrink-0">
                                      {r.collection}
                                    </span>
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-light-fourth">
                                    {label}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => copy(md, "markdown copied")}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] bg-white/[0.04] hover:bg-white/[0.08] text-white transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Copy markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => copy(item.url, "url copied")}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] bg-white/[0.04] hover:bg-white/[0.08] text-white transition-colors"
                    >
                      <Link2 className="w-3 h-3" /> Copy URL
                    </button>
                    <button
                      type="button"
                      disabled={busyKey === key}
                      onClick={() => onDelete(item)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] bg-red-500/10 hover:bg-red-500/20 text-red-300 ring-1 ring-red-500/30 transition-colors disabled:opacity-50"
                    >
                      {busyKey === key ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}{" "}
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-zinc-900 ring-1 ring-white/[0.08] px-3 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
