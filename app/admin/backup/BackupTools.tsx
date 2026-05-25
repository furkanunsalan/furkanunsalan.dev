"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export type CollectionCount = {
  short: string;
  count: number;
  pk: string;
};

type ImportSummary = {
  inserts: number;
  updates: number;
  deletes: number;
  errors: Array<{ rowIndex: number; error: string }>;
};

type ImportResponse = {
  ok: boolean;
  dryRun: boolean;
  mode: "upsert" | "replace";
  summary: ImportSummary;
  error?: string;
};

const LS_PREFIX = "backup:lastExport:";

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (diff < 0 || isNaN(diff)) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function useLastExports(): [
  Record<string, string>,
  (short: string, fmt: string) => void,
] {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (typeof window === "undefined") return;
    const out: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(LS_PREFIX)) continue;
      const v = window.localStorage.getItem(k);
      if (v) out[k.slice(LS_PREFIX.length)] = v;
    }
    setMap(out);
  }, []);
  const mark = (short: string, fmt: string) => {
    const key = `${short}:${fmt}`;
    const now = new Date().toISOString();
    window.localStorage.setItem(LS_PREFIX + key, now);
    setMap((m) => ({ ...m, [key]: now }));
  };
  return [map, mark];
}

export default function BackupTools({ rows }: { rows: CollectionCount[] }) {
  const [lastExports, markExport] = useLastExports();

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 text-xs uppercase tracking-widest text-light-fourth">
          Export
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((r) => (
            <ExportCard
              key={r.short}
              row={r}
              lastJson={lastExports[`${r.short}:json`]}
              lastCsv={lastExports[`${r.short}:csv`]}
              onDownload={markExport}
            />
          ))}
        </div>
      </section>

      <ImportSection rows={rows} />
    </div>
  );
}

function ExportCard({
  row,
  lastJson,
  lastCsv,
  onDownload,
}: {
  row: CollectionCount;
  lastJson?: string;
  lastCsv?: string;
  onDownload: (short: string, fmt: string) => void;
}) {
  const base = `/api/admin/backup/export?collection=${encodeURIComponent(row.short)}`;
  return (
    <div className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-white">{row.short}</div>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] tabular-nums text-light-secondary">
          {row.count} {row.count === 1 ? "row" : "rows"}
        </span>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-light-fourth/70">
        pk: {row.pk}
      </div>
      <div className="mt-3 flex gap-2">
        <a
          href={`${base}&format=json`}
          download
          onClick={() => onDownload(row.short, "json")}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-light-secondary hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-colors"
        >
          <FileJson className="w-3.5 h-3.5" />
          JSON
        </a>
        <a
          href={`${base}&format=csv`}
          download
          onClick={() => onDownload(row.short, "csv")}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-light-secondary hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          CSV
        </a>
      </div>
      {(lastJson || lastCsv) && (
        <div className="mt-3 space-y-0.5 text-[10px] text-light-fourth">
          {lastJson && <div>JSON: last exported {relTime(lastJson)}</div>}
          {lastCsv && <div>CSV: last exported {relTime(lastCsv)}</div>}
        </div>
      )}
    </div>
  );
}

function ImportSection({ rows }: { rows: CollectionCount[] }) {
  const [collection, setCollection] = useState(rows[0]?.short ?? "");
  const [mode, setMode] = useState<"upsert" | "replace">("upsert");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<unknown[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<ImportResponse | null>(null);
  const [applyResult, setApplyResult] = useState<ImportResponse | null>(null);
  const [reqError, setReqError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentCount = useMemo(
    () => rows.find((r) => r.short === collection)?.count ?? 0,
    [rows, collection],
  );

  function reset(keep: { collection?: boolean } = {}) {
    if (!keep.collection) setCollection(rows[0]?.short ?? "");
    setFile(null);
    setParsed(null);
    setParseError(null);
    setDryRunResult(null);
    setApplyResult(null);
    setReqError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onFileChange(f: File | null) {
    setFile(f);
    setParsed(null);
    setParseError(null);
    setDryRunResult(null);
    setApplyResult(null);
    setReqError(null);
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      if (!Array.isArray(json)) {
        setParseError("file must be a JSON array of rows");
        return;
      }
      setParsed(json);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "invalid JSON");
    }
  }

  async function postImport(dryRun: boolean): Promise<ImportResponse | null> {
    setReqError(null);
    setRunning(true);
    try {
      const res = await fetch("/api/admin/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection, rows: parsed ?? [], dryRun, mode }),
      });
      const json = (await res.json().catch(() => null)) as
        | ImportResponse
        | { error: string }
        | null;
      if (!json) {
        setReqError("empty response");
        return null;
      }
      if (!res.ok) {
        const msg = "error" in json ? json.error : "request failed";
        setReqError(msg ?? "request failed");
        if ("summary" in json) return json as ImportResponse;
        return null;
      }
      return json as ImportResponse;
    } catch (e) {
      setReqError(e instanceof Error ? e.message : "request failed");
      return null;
    } finally {
      setRunning(false);
    }
  }

  async function onDryRun() {
    setApplyResult(null);
    const r = await postImport(true);
    setDryRunResult(r);
  }

  async function onApply() {
    if (!dryRunResult) return;
    const s = dryRunResult.summary;
    const msg =
      `Apply import to "${collection}" in ${mode.toUpperCase()} mode?\n\n` +
      `Inserts: ${s.inserts}\nUpdates: ${s.updates}\nDeletes: ${s.deletes}\n\n` +
      (mode === "replace"
        ? `This will DELETE all ${s.deletes} existing rows first.`
        : `Existing rows with matching primary key will be updated.`);
    if (!window.confirm(msg)) return;
    const r = await postImport(false);
    setApplyResult(r);
    if (r?.ok) {
      setDryRunResult(null);
      setParsed(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const canDryRun = !!parsed && !running && !parseError;
  const canApply = !!dryRunResult?.ok && !running;

  return (
    <section>
      <div className="mb-3 text-xs uppercase tracking-widest text-light-fourth">
        Import
      </div>
      <div className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs text-light-secondary space-y-1">
            <span className="block">Collection</span>
            <select
              value={collection}
              onChange={(e) => {
                setCollection(e.target.value);
                setDryRunResult(null);
                setApplyResult(null);
              }}
              className="w-full bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-lg px-3 py-2 text-sm text-white"
            >
              {rows.map((r) => (
                <option key={r.short} value={r.short}>
                  {r.short} ({r.count})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-light-secondary space-y-1">
            <span className="block">Mode</span>
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as "upsert" | "replace");
                setDryRunResult(null);
                setApplyResult(null);
              }}
              className="w-full bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="upsert">
                Upsert (insert new, update existing)
              </option>
              <option value="replace">Replace (delete all, then insert)</option>
            </select>
          </label>
        </div>

        <label className="block text-xs text-light-secondary space-y-1">
          <span className="block">JSON file</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-light-secondary file:mr-3 file:rounded-md file:border file:border-white/10 file:bg-white/[0.03] file:px-3 file:py-1.5 file:text-xs file:text-light-secondary hover:file:bg-white/[0.08]"
          />
          {file && parsed && (
            <span className="text-[11px] text-light-fourth">
              {file.name} — {parsed.length} row{parsed.length === 1 ? "" : "s"}
              {mode === "replace" && currentCount > 0
                ? ` · will delete ${currentCount} existing`
                : ""}
            </span>
          )}
          {parseError && (
            <span className="block text-[11px] text-rose-400">
              {parseError}
            </span>
          )}
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onDryRun}
            disabled={!canDryRun}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-light-secondary hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            {running && !applyResult ? "Running…" : "Dry run"}
          </button>
          <button
            onClick={onApply}
            disabled={!canApply}
            className="inline-flex items-center gap-1.5 rounded-md border border-accent-primary/30 bg-accent-primary/10 px-3 py-1.5 text-xs text-white hover:bg-accent-primary/20 hover:border-accent-primary/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Upload className="w-3.5 h-3.5" />
            Apply
          </button>
          {(dryRunResult || applyResult || reqError) && (
            <button
              onClick={() => reset({ collection: true })}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-xs text-light-fourth hover:text-white transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {reqError && (
          <div className="flex items-start gap-2 rounded-md border border-rose-400/30 bg-rose-400/[0.06] p-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
            <span>{reqError}</span>
          </div>
        )}

        {dryRunResult && !applyResult && (
          <ResultPanel result={dryRunResult} label="Dry run" />
        )}

        {applyResult && <ResultPanel result={applyResult} label="Applied" />}
      </div>
    </section>
  );
}

function ResultPanel({
  result,
  label,
}: {
  result: ImportResponse;
  label: string;
}) {
  const s = result.summary;
  const okIcon = result.ok ? (
    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
  ) : (
    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
  );
  return (
    <div className="rounded-md ring-1 ring-white/[0.06] bg-black p-3 text-xs">
      <div className="flex items-center gap-2 mb-2">
        {okIcon}
        <span className="text-light-secondary">
          {label} · mode {result.mode}
          {result.dryRun ? " · dry run" : ""}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat n={s.inserts} label="inserts" tone="emerald" />
        <Stat n={s.updates} label="updates" tone="amber" />
        <Stat n={s.deletes} label="deletes" tone="rose" />
      </div>
      {s.errors.length > 0 && (
        <div className="mt-3">
          <div className="text-light-fourth mb-1">
            Errors ({s.errors.length}):
          </div>
          <ul className="space-y-1 max-h-48 overflow-auto">
            {s.errors.map((e, i) => (
              <li
                key={i}
                className="font-mono text-[11px] text-rose-300 break-words"
              >
                row #{e.rowIndex}: {e.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone: "emerald" | "amber" | "rose";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "amber"
        ? "text-amber-400"
        : "text-rose-400";
  return (
    <div className="rounded-md bg-white/[0.03] px-2 py-1.5">
      <div className={`text-base font-semibold tabular-nums ${color}`}>{n}</div>
      <div className="text-[10px] uppercase tracking-wider text-light-fourth">
        {label}
      </div>
    </div>
  );
}
