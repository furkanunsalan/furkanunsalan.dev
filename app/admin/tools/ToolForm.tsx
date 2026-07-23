"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Field,
  TextInput,
  NumberInput,
  TextArea,
  Select,
  Toggle,
  SaveBar,
} from "@/components/admin/form";
import GadgetGlyph, { GADGET_SKETCHES } from "@/components/GadgetGlyph";

export type ToolFormValue = {
  name: string;
  brand: string;
  what: string;
  category: "tech" | "desk" | "other";
  order: number;
  comment: string;
  favorite: boolean;
  link: string;
  icon: string;
};

export default function ToolForm({
  initial,
  mode,
}: {
  initial: ToolFormValue;
  mode: "new" | "edit";
}) {
  const router = useRouter();
  const [v, setV] = useState<ToolFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upd = <K extends keyof ToolFormValue>(key: K, val: ToolFormValue[K]) =>
    setV((cur) => ({ ...cur, [key]: val }));

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const url =
        mode === "new"
          ? "/api/admin/tools"
          : `/api/admin/tools/${encodeURIComponent(initial.name)}`;
      const method = mode === "new" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(v),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || `error ${res.status}`);
        setSaving(false);
        return;
      }
      router.replace("/admin/tools");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  async function destroy() {
    if (saving || mode !== "edit") return;
    if (!confirm(`Delete "${v.brand} ${v.what}"? This cannot be undone.`))
      return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/tools/${encodeURIComponent(initial.name)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `error ${res.status}`);
        setSaving(false);
        return;
      }
      router.replace("/admin/tools");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Brand">
          <TextInput value={v.brand} onChange={(s) => upd("brand", s)} />
        </Field>
        <Field label="Type" hint="e.g. keyboard, mouse, IDE">
          <TextInput value={v.what} onChange={(s) => upd("what", s)} required />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field
          label="Name (slug)"
          hint={
            mode === "new" ? "Auto from brand+type if empty" : "Primary key"
          }
        >
          <TextInput
            value={v.name}
            onChange={(s) => upd("name", s)}
            placeholder="auto"
          />
        </Field>
        <Field label="Category">
          <Select
            value={v.category}
            onChange={(c) => upd("category", c)}
            options={[
              { value: "tech", label: "Tech" },
              { value: "desk", label: "Desk" },
              { value: "other", label: "Other" },
            ]}
          />
        </Field>
        <Field label="Order" hint="Lower = first in its category">
          <NumberInput
            value={v.order}
            onChange={(nv) => upd("order", nv ?? 100)}
          />
        </Field>
      </div>

      <Field
        label="Sketch"
        hint="Blueprint icon on the gadgets page. Leave on Auto to derive it from the type."
      >
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
          <PickTile
            selected={!v.icon}
            onClick={() => upd("icon", "")}
            label="Auto"
          >
            <span className="font-mono text-[10px] tracking-wider text-light-fourth">
              AUTO
            </span>
          </PickTile>
          {GADGET_SKETCHES.map((s) => (
            <PickTile
              key={s.key}
              selected={v.icon === s.key}
              onClick={() => upd("icon", s.key)}
              label={s.label}
            >
              <GadgetGlyph
                icon={s.key}
                className="h-7 w-7 text-light-secondary"
              />
            </PickTile>
          ))}
        </div>
      </Field>

      <Field label="Comment">
        <TextArea
          value={v.comment}
          onChange={(s) => upd("comment", s)}
          rows={4}
        />
      </Field>

      <Field label="Link">
        <TextInput type="url" value={v.link} onChange={(s) => upd("link", s)} />
      </Field>

      <Field label="Favorite">
        <Toggle
          value={v.favorite}
          onChange={(b) => upd("favorite", b)}
          label="Show with a star"
        />
      </Field>

      <SaveBar
        saving={saving}
        error={error}
        onSave={save}
        onDelete={mode === "edit" ? destroy : undefined}
        onCancel={() => router.replace("/admin/tools")}
      />
    </form>
  );
}

function PickTile({
  selected,
  onClick,
  label,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={selected}
      className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 ring-1 transition-colors ${
        selected
          ? "bg-accent-primary/10 text-accent-primary ring-accent-primary/60"
          : "ring-white/[0.08] hover:ring-white/25"
      }`}
    >
      <span className="flex h-7 items-center justify-center">{children}</span>
      <span className="max-w-full truncate px-1 text-[8px] uppercase tracking-wide text-light-fourth">
        {label}
      </span>
    </button>
  );
}
