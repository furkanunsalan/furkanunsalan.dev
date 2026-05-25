"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

type Snap = Record<string, unknown> | null;

const DOT: Record<string, string> = {
  create: "bg-emerald-400",
  update: "bg-indigo-400",
  delete: "bg-rose-400",
  restore: "bg-amber-400",
  purge: "bg-red-700",
  "bulk-delete": "bg-rose-500",
};

const CHIP_TEXT: Record<string, string> = {
  create: "text-emerald-300",
  update: "text-indigo-300",
  delete: "text-rose-300",
  restore: "text-amber-300",
  purge: "text-red-300",
  "bulk-delete": "text-rose-300",
};

const RELS: [number, string][] = [
  [60, "s"],
  [60, "m"],
  [24, "h"],
  [7, "d"],
  [4.345, "w"],
  [12, "mo"],
  [Infinity, "y"],
];

function relative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return iso;
  let diff = Math.max(1, Math.floor((Date.now() - then) / 1000));
  for (const [step, unit] of RELS) {
    if (diff < step) return `${diff}${unit} ago`;
    diff = Math.floor(diff / step);
  }
  return iso;
}

type DiffKind = "added" | "removed" | "changed" | "same";

type DiffEntry = {
  key: string;
  kind: DiffKind;
  before: unknown;
  after: unknown;
};

function shallowDiff(before: Snap, after: Snap): DiffEntry[] {
  const keys = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  const out: DiffEntry[] = [];
  for (const k of keys) {
    const b = (before ?? {})[k];
    const a = (after ?? {})[k];
    const hasB = before != null && k in before;
    const hasA = after != null && k in after;
    let kind: DiffKind = "same";
    if (hasA && !hasB) kind = "added";
    else if (hasB && !hasA) kind = "removed";
    else if (JSON.stringify(b) !== JSON.stringify(a)) kind = "changed";
    out.push({ key: k, kind, before: b, after: a });
  }
  out.sort((x, y) => {
    const order: Record<DiffKind, number> = {
      changed: 0,
      added: 1,
      removed: 2,
      same: 3,
    };
    if (order[x.kind] !== order[y.kind]) return order[x.kind] - order[y.kind];
    return x.key.localeCompare(y.key);
  });
  return out;
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 200 ? v.slice(0, 200) + "…" : v;
  try {
    const s = JSON.stringify(v);
    return s.length > 200 ? s.slice(0, 200) + "…" : s;
  } catch {
    return String(v);
  }
}

export default function ActivityRow({
  at,
  action,
  resource,
  rowId,
  ip,
  before,
  after,
}: {
  id: number;
  at: string;
  action: string;
  resource: string;
  rowId: string;
  ip: string | null;
  before: Snap;
  after: Snap;
}) {
  const [open, setOpen] = useState(false);
  const diff = useMemo(
    () => (open ? shallowDiff(before, after) : []),
    [open, before, after],
  );

  const dot = DOT[action] ?? "bg-zinc-500";
  const chip = CHIP_TEXT[action] ?? "text-light-secondary";
  const absolute = new Date(at).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <li className="px-4 py-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 text-sm text-left"
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${dot} shrink-0`}
          aria-hidden
        />
        <span
          className={`text-[10px] uppercase tracking-widest font-semibold ${chip} w-20 shrink-0`}
        >
          {action}
        </span>
        <span className="text-light-secondary text-xs shrink-0">
          {resource}
        </span>
        <span className="font-mono text-xs text-light-fourth truncate">
          {rowId}
        </span>
        <time
          dateTime={at}
          title={absolute}
          className="ml-auto text-xs text-light-fourth tabular-nums shrink-0"
        >
          {relative(at)}
        </time>
        <span className="font-mono text-[10px] text-light-fourth/70 hidden sm:inline shrink-0 max-w-[12rem] truncate">
          {ip ?? "—"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-light-fourth/60 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3 ml-5 rounded-lg ring-1 ring-white/[0.06] bg-black/40 overflow-hidden">
          {diff.length === 0 ? (
            <p className="px-3 py-2 text-xs text-light-fourth">
              No snapshot recorded.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-light-fourth/80 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="text-left px-3 py-1.5 w-32">Field</th>
                  <th className="text-left px-3 py-1.5">Before</th>
                  <th className="text-left px-3 py-1.5">After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {diff.map((d) => (
                  <tr
                    key={d.key}
                    className={
                      d.kind === "same"
                        ? "text-light-fourth/70"
                        : "text-light-secondary"
                    }
                  >
                    <td className="px-3 py-1.5 align-top font-mono">
                      <span
                        className={
                          d.kind === "added"
                            ? "text-emerald-300"
                            : d.kind === "removed"
                              ? "text-rose-300"
                              : d.kind === "changed"
                                ? "text-indigo-300"
                                : ""
                        }
                      >
                        {d.key}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 align-top whitespace-pre-wrap break-words font-mono">
                      {fmt(d.before)}
                    </td>
                    <td className="px-3 py-1.5 align-top whitespace-pre-wrap break-words font-mono">
                      {fmt(d.after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </li>
  );
}
