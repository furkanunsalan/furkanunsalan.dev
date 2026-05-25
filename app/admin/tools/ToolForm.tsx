"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Field,
  TextInput,
  TextArea,
  Select,
  Toggle,
  SaveBar,
} from "@/components/admin/form";

export type ToolFormValue = {
  name: string;
  brand: string;
  what: string;
  category: "tech" | "desk" | "other";
  comment: string;
  favorite: boolean;
  link: string;
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>

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
