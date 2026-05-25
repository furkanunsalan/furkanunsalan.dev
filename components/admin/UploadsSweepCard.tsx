"use client";

import { useState } from "react";
import { Trash2, Eye, Loader2 } from "lucide-react";

type DirReport = {
  kept: number;
  deleted: string[];
  errors: { file: string; error: string }[];
};

type SweepResponse = {
  ok: true;
  dryRun: boolean;
  target: string;
  totals: { kept: number; deleted: number };
  report: Record<string, DirReport>;
};

export default function UploadsSweepCard() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SweepResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(dryRun: boolean) {
    if (busy) return;
    if (
      !dryRun &&
      !confirm("Delete every unreferenced upload? Cannot be undone.")
    )
      return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/uploads/sweep", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const j = (await res.json()) as SweepResponse | { error: string };
      if (!res.ok || !("ok" in j)) {
        throw new Error(("error" in j && j.error) || `error ${res.status}`);
      }
      setResult(j);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-light-fourth">
            Uploads sweep
          </div>
          <p className="mt-1 text-[11px] text-light-fourth/80 max-w-xl">
            Delete files in UPLOADS_DIR that are not referenced by any post,
            project, or experience. Dry-run lists candidates without touching
            disk.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => run(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-light-secondary hover:text-white hover:bg-white/[0.08] hover:border-white/20 disabled:opacity-50 transition-colors"
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            Dry run
          </button>
          <button
            type="button"
            onClick={() => run(false)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/[0.06] px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/[0.12] hover:border-rose-500/50 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Sweep
          </button>
        </div>
      </header>

      {error && <div className="mt-3 text-xs text-rose-400">{error}</div>}

      {result && (
        <div className="mt-3 space-y-2">
          <div className="text-xs text-light-secondary">
            {result.dryRun ? "Dry run — nothing deleted. " : "Done. "}
            <span className="text-emerald-400 font-semibold tabular-nums">
              {result.totals.kept}
            </span>{" "}
            kept ·{" "}
            <span className="text-rose-400 font-semibold tabular-nums">
              {result.totals.deleted}
            </span>{" "}
            {result.dryRun ? "would be deleted" : "deleted"}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-light-fourth/70 font-mono">
            target: {result.target}
          </div>
          <ul className="text-[11px] text-light-fourth space-y-0.5 max-h-48 overflow-y-auto">
            {Object.entries(result.report).map(([dir, r]) =>
              r.deleted.length === 0 && r.errors.length === 0 ? null : (
                <li key={dir}>
                  <span className="text-light-secondary font-mono">{dir}/</span>
                  {r.deleted.length > 0 && (
                    <span>
                      {" "}
                      — {r.deleted.length}{" "}
                      {result.dryRun ? "candidate" : "deleted"}
                      {r.deleted.length === 1 ? "" : "s"}
                    </span>
                  )}
                  {r.errors.length > 0 && (
                    <span className="text-rose-400">
                      {" "}
                      · {r.errors.length} error
                      {r.errors.length === 1 ? "" : "s"}
                    </span>
                  )}
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
