"use client";

import { useEffect, useMemo, useState } from "react";

type AppliedRow = {
  id: number;
  hash: string;
  createdAt: string | null;
};

type Status = "applied" | "pending" | "orphan";

export default function MigrationsTab() {
  const [files, setFiles] = useState<string[]>([]);
  const [applied, setApplied] = useState<AppliedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/db/migrations");
        const j = await res.json();
        if (cancelled) return;
        if (!res.ok || !j.ok) {
          setError(j.error || `error ${res.status}`);
        } else {
          setFiles(j.files || []);
          setApplied(j.applied || []);
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

  const merged = useMemo(() => {
    // The journal records the migration tag (without numeric prefix); the
    // file column shows what's on disk. Match by sorted order — that's what
    // drizzle's runner uses internally — and surface anything that doesn't
    // line up as orphan/pending.
    const fileList = [...files].sort();
    const appliedSorted = [...applied].sort((a, b) => a.id - b.id);

    const rows: Array<{
      key: string;
      file: string | null;
      status: Status;
      appliedAt: string | null;
      hash: string | null;
    }> = [];

    const maxLen = Math.max(fileList.length, appliedSorted.length);
    for (let i = 0; i < maxLen; i++) {
      const f = fileList[i] ?? null;
      const a = appliedSorted[i] ?? null;
      if (f && a) {
        rows.push({
          key: f,
          file: f,
          status: "applied",
          appliedAt: a.createdAt,
          hash: a.hash,
        });
      } else if (f && !a) {
        rows.push({
          key: f,
          file: f,
          status: "pending",
          appliedAt: null,
          hash: null,
        });
      } else if (!f && a) {
        rows.push({
          key: `db-${a.id}`,
          file: null,
          status: "orphan",
          appliedAt: a.createdAt,
          hash: a.hash,
        });
      }
    }

    return rows;
  }, [files, applied]);

  if (loading) {
    return <div className="text-sm text-light-fourth">Loading migrations…</div>;
  }
  if (error) {
    return (
      <div className="rounded-lg ring-1 ring-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-400">
        {error}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-[11px] text-light-fourth">
        Read-only. Pending migrations apply via{" "}
        <code className="font-mono">npm run db:migrate</code> with the SSH
        tunnel open.
      </p>
      <div className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/[0.03] text-light-fourth">
              <th className="text-left px-3 py-2 font-normal">File</th>
              <th className="text-left px-3 py-2 font-normal">Status</th>
              <th className="text-left px-3 py-2 font-normal">Applied at</th>
              <th className="text-left px-3 py-2 font-normal">Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {merged.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-light-fourth"
                >
                  No migrations.
                </td>
              </tr>
            )}
            {merged.map((r) => (
              <tr key={r.key}>
                <td className="px-3 py-1.5 font-mono text-white">
                  {r.file ?? (
                    <span className="text-light-fourth italic">
                      (missing on disk)
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <StatusChip s={r.status} />
                </td>
                <td className="px-3 py-1.5 font-mono text-light-secondary tabular-nums">
                  {r.appliedAt ? formatAt(r.appliedAt) : "—"}
                </td>
                <td className="px-3 py-1.5 font-mono text-light-fourth/70">
                  {r.hash ? r.hash.slice(0, 12) + "…" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusChip({ s }: { s: Status }) {
  if (s === "applied") {
    return (
      <span className="inline-block rounded-full bg-emerald-400/15 text-emerald-400 px-2 py-0.5 text-[10px] uppercase tracking-widest">
        applied
      </span>
    );
  }
  if (s === "pending") {
    return (
      <span className="inline-block rounded-full bg-amber-400/15 text-amber-400 px-2 py-0.5 text-[10px] uppercase tracking-widest">
        pending
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-rose-400/15 text-rose-400 px-2 py-0.5 text-[10px] uppercase tracking-widest">
      orphan in db
    </span>
  );
}

function formatAt(at: string): string {
  const n = Number(at);
  const d = Number.isFinite(n) && String(n) === at ? new Date(n) : new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
