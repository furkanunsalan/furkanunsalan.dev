"use client";

import { useRouter } from "@/components/_compat";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, TextInput, SaveBar } from "@/components/admin/form";
import { iconKey, type ListIconKey } from "@/lib/place-list-icons";
import { PLACE_LIST_ICON_COMPONENTS } from "@/lib/place-list-icons-react";
import IconPicker from "@/components/admin/IconPicker";

type Row = {
  name: string;
  icon: string;
  position: number;
  placeCount: number;
};

export default function PlaceListsEditor({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  // Track last-persisted position per row so onBlur can skip PATCHing when
  // the value hasn't actually changed.
  const [persistedPos] = useState<Map<string, number>>(
    () => new Map(initial.map((r) => [r.name, r.position])),
  );
  const [draftName, setDraftName] = useState("");
  const [draftIcon, setDraftIcon] = useState<ListIconKey>("map-pin");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const name = draftName.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/place-lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          icon: draftIcon,
          position: (rows[rows.length - 1]?.position ?? 0) + 10,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || `error ${res.status}`);
      } else {
        setRows((cur) => [
          ...cur,
          {
            name: j.row.name,
            icon: j.row.icon,
            position: j.row.position,
            placeCount: 0,
          },
        ]);
        setDraftName("");
        setDraftIcon("map-pin");
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function updateRow(name: string, patch: Partial<Row>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/place-lists/${encodeURIComponent(name)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || `error ${res.status}`);
      } else {
        setRows((cur) =>
          cur.map((r) => (r.name === name ? { ...r, ...patch } : r)),
        );
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function destroy(name: string, placeCount: number) {
    const detach =
      placeCount > 0
        ? ` ${placeCount} place${placeCount === 1 ? "" : "s"} currently assigned to it will be detached (their list field will go blank).`
        : "";
    if (!confirm(`Delete list "${name}"?${detach}`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/place-lists/${encodeURIComponent(name)}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `error ${res.status}`);
      } else {
        setRows((cur) => cur.filter((r) => r.name !== name));
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <ul className="divide-y divide-white/[0.04] ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950">
          {rows.length === 0 && (
            <li className="px-4 py-6 text-sm text-light-fourth text-center">
              No lists yet.
            </li>
          )}
          {rows.map((r) => {
            const IconComp = PLACE_LIST_ICON_COMPONENTS[iconKey(r.icon)];
            return (
              <li
                key={r.name}
                className="px-4 py-3 flex flex-wrap items-center gap-3"
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06] shrink-0">
                  <IconComp className="w-4 h-4 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">{r.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-light-fourth">
                    {r.placeCount} place{r.placeCount === 1 ? "" : "s"} · order{" "}
                    {r.position}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  <IconPicker
                    value={iconKey(r.icon)}
                    onChange={(k) => updateRow(r.name, { icon: k })}
                    disabled={saving}
                  />
                  <input
                    type="number"
                    value={r.position}
                    onChange={(e) => {
                      const pos = Number(e.target.value);
                      setRows((cur) =>
                        cur.map((x) =>
                          x.name === r.name ? { ...x, position: pos } : x,
                        ),
                      );
                    }}
                    onBlur={() => {
                      if (persistedPos.get(r.name) === r.position) return;
                      persistedPos.set(r.name, r.position);
                      updateRow(r.name, { position: r.position });
                    }}
                    className="w-16 bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-md px-2 py-1 text-xs text-white text-center"
                  />
                  <button
                    type="button"
                    onClick={() => destroy(r.name, r.placeCount)}
                    disabled={saving}
                    className="rounded-md p-1.5 text-light-fourth hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
                    aria-label={`delete ${r.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-4 space-y-3">
        <div className="text-xs uppercase tracking-widest text-light-fourth">
          Add a list
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2 items-end">
          <Field label="Name">
            <TextInput
              value={draftName}
              onChange={setDraftName}
              placeholder="e.g. Drinks"
            />
          </Field>
          <Field label="Icon">
            <IconPicker value={draftIcon} onChange={(k) => setDraftIcon(k)} />
          </Field>
          <button
            type="button"
            onClick={add}
            disabled={saving || !draftName.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs bg-accent-primary/15 text-accent-primary ring-1 ring-accent-primary/40 hover:bg-accent-primary/25 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add list
          </button>
        </div>
      </section>

      <SaveBar
        saving={saving}
        error={error}
        onSave={() => {
          /* changes apply per-row */
        }}
        saveLabel="Done"
      />
    </div>
  );
}
