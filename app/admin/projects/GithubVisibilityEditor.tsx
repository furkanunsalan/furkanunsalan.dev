"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronUp, ChevronDown, Pin, Eye, RefreshCw } from "lucide-react";
import { Toggle, SaveBar } from "@/components/admin/form";

type Row = {
  name: string;
  visible: boolean;
  pinned: boolean;
  pinOrder: number;
};

export default function GithubVisibilityEditor({
  initial,
}: {
  initial: Row[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function set(i: number, p: Partial<Row>) {
    setRows((cur) => cur.map((r, j) => (j === i ? { ...r, ...p } : r)));
  }

  function swap(i: number, j: number) {
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/github", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `error ${res.status}`);
      } else {
        setInfo("saved");
        setTimeout(() => setInfo(null), 1500);
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function sync() {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/admin/settings/github/sync", {
        method: "POST",
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || `error ${res.status}`);
      } else {
        setInfo(
          `+${j.added} added · ${j.preserved} kept · -${j.removed} removed (total ${j.total})`,
        );
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  const pinned = rows.filter((r) => r.pinned);
  const rest = rows.filter((r) => !r.pinned);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={sync}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ring-1 ring-white/[0.08] hover:ring-white/20 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
          />
          Sync from GitHub
        </button>
        {info && <span className="text-xs text-emerald-400">{info}</span>}
      </div>

      <section>
        <div className="text-[10px] uppercase tracking-widest text-light-fourth mb-2 flex items-center gap-1.5">
          <Pin className="w-3 h-3" />
          Pinned ({pinned.length})
        </div>
        <ul className="divide-y divide-white/[0.04] ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950">
          {pinned.length === 0 && (
            <li className="px-4 py-3 text-xs text-light-fourth text-center">
              None
            </li>
          )}
          {pinned.map((r) => {
            const i = rows.indexOf(r);
            const pi = pinned.indexOf(r);
            return (
              <li key={r.name} className="px-3 py-2 flex items-center gap-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => {
                      const prev = rows.indexOf(pinned[pi - 1]);
                      if (prev >= 0) swap(i, prev);
                    }}
                    disabled={pi === 0}
                    className="text-light-fourth hover:text-white disabled:opacity-30"
                    aria-label="move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nxt = rows.indexOf(pinned[pi + 1]);
                      if (nxt >= 0) swap(i, nxt);
                    }}
                    disabled={pi === pinned.length - 1}
                    className="text-light-fourth hover:text-white disabled:opacity-30"
                    aria-label="move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 text-sm text-white truncate">
                  {r.name}
                </div>
                <Toggle
                  value={r.visible}
                  onChange={(b) => set(i, { visible: b })}
                  label="visible"
                />
                <Toggle
                  value={r.pinned}
                  onChange={(b) => set(i, { pinned: b })}
                  label="pinned"
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <div className="text-[10px] uppercase tracking-widest text-light-fourth mb-2 flex items-center gap-1.5">
          <Eye className="w-3 h-3" />
          Repos ({rest.length})
        </div>
        <ul className="divide-y divide-white/[0.04] ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950 max-h-[60vh] overflow-y-auto">
          {rest.map((r) => {
            const i = rows.indexOf(r);
            return (
              <li key={r.name} className="px-4 py-2 flex items-center gap-3">
                <div className="flex-1 text-sm text-white truncate">
                  {r.name}
                </div>
                <Toggle
                  value={r.visible}
                  onChange={(b) => set(i, { visible: b })}
                  label="visible"
                />
                <Toggle
                  value={r.pinned}
                  onChange={(b) => set(i, { pinned: b })}
                  label="pin"
                />
              </li>
            );
          })}
        </ul>
      </section>

      <SaveBar saving={saving} error={error} onSave={save} />
    </div>
  );
}
