"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X, Pencil } from "lucide-react";

type Cell = unknown;
type Row = Record<string, Cell>;
type Column = {
  name: string;
  type: string;
  nullable?: boolean;
  pk?: boolean;
};

const PAGE_SIZE = 50;

function formatCell(v: Cell): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function truncate(s: string, n = 80): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}

export default function BrowseTab() {
  const [tables, setTables] = useState<string[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [drawerRow, setDrawerRow] = useState<Row | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/db/tables");
        const j = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setTablesError(j.error || `error ${res.status}`);
        } else {
          setTables(j.tables || []);
          if ((j.tables || []).length > 0) {
            setActive((cur) => cur ?? j.tables[0]);
          }
        }
      } catch (e) {
        if (!cancelled) setTablesError((e as Error).message);
      } finally {
        if (!cancelled) setTablesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  // Reset page when switching tables or search
  useEffect(() => {
    setPage(1);
  }, [active, qDebounced]);

  const loadRows = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        table: active,
        page: String(page),
      });
      if (qDebounced) qs.set("q", qDebounced);
      const res = await fetch(`/api/admin/db/rows?${qs.toString()}`);
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || `error ${res.status}`);
        setRows([]);
        setColumns([]);
        setTotal(0);
      } else {
        setColumns(j.columns || []);
        setRows(j.rows || []);
        setTotal(j.total || 0);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [active, page, qDebounced]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
      <aside className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 overflow-hidden">
        <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-light-fourth/70 border-b border-white/[0.06]">
          Tables
        </div>
        {tablesLoading && (
          <div className="px-3 py-2 text-xs text-light-fourth">loading…</div>
        )}
        {tablesError && (
          <div className="px-3 py-2 text-xs text-rose-400">{tablesError}</div>
        )}
        <ul className="max-h-[60vh] overflow-y-auto py-1">
          {tables.map((t) => {
            const isActive = t === active;
            return (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => setActive(t)}
                  className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                    isActive
                      ? "bg-accent-primary/15 text-accent-primary"
                      : "text-light-secondary hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  {t}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-2 flex-1 bg-black ring-1 ring-white/[0.08] focus-within:ring-accent-primary/60 rounded-lg px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-light-fourth shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                active ? `Search ${active}…` : "Pick a table to search"
              }
              disabled={!active}
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-light-fourth"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="text-light-fourth hover:text-white"
                aria-label="clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="text-[11px] text-light-fourth tabular-nums">
            {loading ? "…" : `${total} row${total === 1 ? "" : "s"}`}
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-lg ring-1 ring-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-400">
            {error}
          </div>
        )}

        <div className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-white/[0.03] text-light-fourth">
                  {columns.map((c) => (
                    <th
                      key={c.name}
                      className="text-left px-3 py-2 font-normal whitespace-nowrap"
                      title={c.type}
                    >
                      {c.name}
                      <span className="ml-1 text-light-fourth/50">
                        {c.type}
                      </span>
                    </th>
                  ))}
                  {columns.length === 0 && (
                    <th className="text-left px-3 py-2 font-normal text-light-fourth">
                      —
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rows.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={Math.max(1, columns.length)}
                      className="px-3 py-6 text-center text-light-fourth"
                    >
                      No rows.
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    onClick={() => setDrawerRow(r)}
                    className="hover:bg-white/[0.03] cursor-pointer"
                  >
                    {columns.map((c) => {
                      const v = formatCell(r[c.name]);
                      const isNull =
                        r[c.name] === null || r[c.name] === undefined;
                      return (
                        <td
                          key={c.name}
                          className={`px-3 py-1.5 align-top whitespace-nowrap ${
                            isNull
                              ? "text-light-fourth/50 italic"
                              : "text-light-secondary"
                          }`}
                          title={v}
                        >
                          {isNull ? "null" : truncate(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {pageCount > 1 && (
          <div className="mt-3 flex items-center justify-between text-xs text-light-fourth">
            <span className="tabular-nums">
              Page {page} of {pageCount}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md px-2 py-1 ring-1 ring-white/[0.08] hover:ring-white/20 hover:text-white disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= pageCount || loading}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="rounded-md px-2 py-1 ring-1 ring-white/[0.08] hover:ring-white/20 hover:text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {drawerRow && active && (
          <RowDrawer
            row={drawerRow}
            columns={columns}
            table={active}
            onClose={() => setDrawerRow(null)}
            onSaved={(updated) => {
              setRows((prev) =>
                prev.map((r) => (r === drawerRow ? updated : r)),
              );
              setDrawerRow(updated);
            }}
          />
        )}
      </section>
    </div>
  );
}

// Represent a cell value as the string the editor shows. Objects/arrays are
// JSON-encoded so they round-trip through the textarea controls.
function toEditString(v: Cell): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

type EditState = { text: string; isNull: boolean };

function RowDrawer({
  row,
  columns,
  table,
  onClose,
  onSaved,
}: {
  row: Row;
  columns: Column[];
  table: string;
  onClose: () => void;
  onSaved: (updated: Row) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pkCols = useMemo(
    () => columns.filter((c) => c.pk).map((c) => c.name),
    [columns],
  );

  const initial = useMemo(() => {
    const m: Record<string, EditState> = {};
    for (const c of columns) {
      const v = row[c.name];
      m[c.name] = {
        text: toEditString(v),
        isNull: v === null || v === undefined,
      };
    }
    return m;
  }, [row, columns]);

  const [edits, setEdits] = useState<Record<string, EditState>>(initial);

  // Reset the form whenever the underlying row changes (e.g. after a save).
  useEffect(() => {
    setEdits(initial);
    setEditing(false);
    setError(null);
  }, [initial]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setField = (name: string, next: Partial<EditState>) =>
    setEdits((cur) => ({ ...cur, [name]: { ...cur[name], ...next } }));

  async function save() {
    if (saving) return;
    if (pkCols.length === 0) {
      setError("table has no primary key — editing is disabled");
      return;
    }
    const patch: Record<string, string | null> = {};
    for (const c of columns) {
      if (c.pk) continue;
      const cur = edits[c.name];
      const init = initial[c.name];
      if (!cur) continue;
      if (cur.isNull !== init.isNull || cur.text !== init.text) {
        patch[c.name] = cur.isNull ? null : cur.text;
      }
    }
    if (Object.keys(patch).length === 0) {
      setError("no changes");
      return;
    }
    const pk: Record<string, string> = {};
    for (const col of pkCols) pk[col] = toEditString(row[col]);

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/db/rows", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ table, pk, patch }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || `error ${res.status}`);
        return;
      }
      onSaved(j.row as Row);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const isLong = (type: string) =>
    type === "text" || type === "ARRAY" || type === "jsonb" || type === "json";

  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-stretch justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-zinc-950 ring-1 ring-white/[0.08] h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-zinc-950/95 backdrop-blur px-4 py-3">
          <span className="text-xs uppercase tracking-widest text-light-fourth">
            Row ·{" "}
            <span className="font-mono text-light-secondary">{table}</span>
          </span>
          <div className="flex items-center gap-1">
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ring-1 ring-white/[0.08] text-light-secondary hover:text-white hover:ring-white/20"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-light-fourth hover:text-white hover:bg-white/[0.06]"
              aria-label="close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!editing ? (
          <pre className="p-4 text-[11.5px] font-mono whitespace-pre-wrap break-words text-light-secondary">
            {JSON.stringify(row, null, 2)}
          </pre>
        ) : (
          <div className="p-4 space-y-4">
            <p className="text-[11px] text-light-fourth">
              Manual override — writes straight to{" "}
              <span className="font-mono">{table}</span>. Primary keys are
              read-only. Arrays / JSON take JSON text.
            </p>
            {columns.map((c) => {
              const e = edits[c.name];
              if (!e) return null;
              const locked = !!c.pk;
              return (
                <div key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-light-secondary">
                      {c.name}
                      <span className="ml-1 text-light-fourth/60 font-mono">
                        {c.type}
                        {c.pk ? " · pk" : ""}
                      </span>
                    </label>
                    {!locked && c.nullable && (
                      <label className="flex items-center gap-1 text-[11px] text-light-fourth cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={e.isNull}
                          onChange={(ev) =>
                            setField(c.name, { isNull: ev.target.checked })
                          }
                        />
                        null
                      </label>
                    )}
                  </div>
                  {c.type === "boolean" && !locked ? (
                    <select
                      value={e.text === "true" ? "true" : "false"}
                      disabled={e.isNull}
                      onChange={(ev) =>
                        setField(c.name, {
                          text: ev.target.value,
                          isNull: false,
                        })
                      }
                      className="w-full bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-lg px-3 py-2 text-sm text-white disabled:opacity-40"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : isLong(c.type) && !locked ? (
                    <textarea
                      value={e.isNull ? "" : e.text}
                      disabled={locked || e.isNull}
                      onChange={(ev) =>
                        setField(c.name, {
                          text: ev.target.value,
                          isNull: false,
                        })
                      }
                      rows={3}
                      className="w-full bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-lg px-3 py-2 text-[12.5px] font-mono text-white resize-y disabled:opacity-40"
                    />
                  ) : (
                    <input
                      value={
                        locked
                          ? toEditString(row[c.name])
                          : e.isNull
                            ? ""
                            : e.text
                      }
                      disabled={locked || e.isNull}
                      onChange={(ev) =>
                        setField(c.name, {
                          text: ev.target.value,
                          isNull: false,
                        })
                      }
                      placeholder={e.isNull ? "null" : ""}
                      className="w-full bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-lg px-3 py-2 text-sm font-mono text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  )}
                </div>
              );
            })}

            <div className="sticky bottom-0 -mx-4 mt-6 border-t border-white/[0.06] bg-zinc-950/95 backdrop-blur px-4 py-3 flex items-center gap-3">
              {error && (
                <span className="text-xs text-rose-400 mr-auto">{error}</span>
              )}
              {!error && <span className="mr-auto" />}
              <button
                type="button"
                onClick={() => {
                  setEdits(initial);
                  setEditing(false);
                  setError(null);
                }}
                disabled={saving}
                className="rounded-lg px-3 py-1.5 text-xs ring-1 ring-white/[0.08] text-light-secondary hover:text-white hover:ring-white/20 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg px-3 py-1.5 text-xs bg-accent-primary/15 text-accent-primary ring-1 ring-accent-primary/40 hover:bg-accent-primary/25 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
