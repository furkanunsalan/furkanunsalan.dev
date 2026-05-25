"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ComboInput, Field, TextInput } from "@/components/admin/form";
import { Replace, Tag, FolderTree, ListTree } from "lucide-react";

type Kind = "category" | "list" | "tag";

type Result =
  | {
      ok: true;
      affected: Record<string, number>;
      total: number;
      merged?: boolean;
    }
  | { ok: false; error: string };

export default function RenameTool({
  categories,
  lists,
  tags,
}: {
  categories: string[];
  lists: string[];
  tags: string[];
}) {
  return (
    <div className="space-y-6">
      <Card
        kind="category"
        title="Place category"
        Icon={FolderTree}
        description="Updates places.category in one statement."
        options={categories}
        impactLabel="places"
      />
      <Card
        kind="list"
        title="Place list"
        Icon={ListTree}
        description="Renames place_lists.name and every places.list reference in one transaction. If the target name already exists, the lists are merged."
        options={lists}
        impactLabel="places"
      />
      <Card
        kind="tag"
        title="Tag"
        Icon={Tag}
        description="array_replace across posts.tags, places.tags, and thoughts.tags."
        options={tags}
        impactLabel="rows across posts / places / thoughts"
      />
    </div>
  );
}

function Card({
  kind,
  title,
  Icon,
  description,
  options,
  impactLabel,
}: {
  kind: Kind;
  title: string;
  Icon: typeof Replace;
  description: string;
  options: string[];
  impactLabel: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    const f = from.trim();
    const t = to.trim();
    if (!f || !t) {
      setResult({ ok: false, error: "both fields are required" });
      return;
    }
    if (f === t) {
      setResult({ ok: false, error: "from and to are identical" });
      return;
    }
    const confirmed = window.confirm(
      `Rename ${title.toLowerCase()} "${f}" → "${t}" everywhere it's used?\n\nThis writes to every matching row across the affected tables. Continue?`,
    );
    if (!confirmed) return;

    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/rename", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, from: f, to: t }),
      });
      const j = await res.json();
      if (!res.ok) {
        setResult({ ok: false, error: j.error || `error ${res.status}` });
      } else {
        setResult({
          ok: true,
          affected: j.affected || {},
          total: j.total || 0,
          merged: j.merged,
        });
        setFrom("");
        setTo("");
        router.refresh();
      }
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-4 sm:p-5">
      <header className="mb-4 flex items-start gap-3">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-md ring-1 ring-white/[0.06] text-light-secondary">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-xs text-light-fourth">{description}</p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="From">
          <ComboInput
            value={from}
            onChange={setFrom}
            options={options}
            placeholder="existing value"
          />
        </Field>
        <Field label="To">
          <TextInput value={to} onChange={setTo} placeholder="new value" />
        </Field>
        <button
          type="button"
          onClick={run}
          disabled={busy || !from.trim() || !to.trim()}
          className="rounded-lg px-3 py-2 text-xs ring-1 ring-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed h-fit"
        >
          {busy ? "Renaming…" : "Rename"}
        </button>
      </div>

      {result && (
        <div className="mt-3 text-xs">
          {result.ok ? (
            <p className="text-emerald-300">{summarize(result, impactLabel)}</p>
          ) : (
            <p className="text-rose-400">{result.error}</p>
          )}
        </div>
      )}
    </section>
  );
}

function summarize(
  r: { affected: Record<string, number>; total: number; merged?: boolean },
  fallback: string,
): string {
  const parts = Object.entries(r.affected)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k}`);
  if (r.total === 0 && parts.length === 0) {
    return "No rows matched — nothing to rename.";
  }
  const tail = r.merged ? " (merged into existing list)" : "";
  if (parts.length === 0) {
    return `Updated ${r.total} ${fallback}.${tail}`;
  }
  return `Updated ${parts.join(", ")}.${tail}`;
}
