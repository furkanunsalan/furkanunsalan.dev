"use client";

import { useRouter } from "@/components/_compat";
import { useState } from "react";
import {
  Field,
  TextInput,
  NumberInput,
  TextArea,
  LinkArrayInput,
  ImageArrayInput,
  ImageInput,
  SaveBar,
  type LabelUrl,
} from "@/components/admin/form";

export type ExperienceFormValue = {
  id: string;
  order: number | null;
  organization: string;
  title: string;
  startDate: string;
  endDate: string;
  comment: string;
  logo: string;
  links: LabelUrl[];
  images: string[];
};

export default function ExperienceForm({
  initial,
  mode,
}: {
  initial: ExperienceFormValue;
  mode: "new" | "edit";
}) {
  const router = useRouter();
  const [v, setV] = useState<ExperienceFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upd = <K extends keyof ExperienceFormValue>(
    key: K,
    val: ExperienceFormValue[K],
  ) => setV((cur) => ({ ...cur, [key]: val }));

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const url =
        mode === "new"
          ? "/api/admin/experiences"
          : `/api/admin/experiences/${encodeURIComponent(initial.id)}`;
      const method = mode === "new" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...v,
          order: v.order ?? 100,
          endDate: v.endDate || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || `error ${res.status}`);
        setSaving(false);
        return;
      }
      router.replace("/admin/experiences");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  async function destroy() {
    if (saving || mode !== "edit") return;
    if (!confirm(`Delete this entry? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/experiences/${encodeURIComponent(initial.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `error ${res.status}`);
        setSaving(false);
        return;
      }
      router.replace("/admin/experiences");
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
        <Field label="Organization">
          <TextInput
            value={v.organization}
            onChange={(s) => upd("organization", s)}
            required
          />
        </Field>
        <Field label="Title">
          <TextInput
            value={v.title}
            onChange={(s) => upd("title", s)}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field
          label="ID"
          hint={mode === "new" ? "Auto-derived if empty" : "Primary key"}
        >
          <TextInput
            value={v.id}
            onChange={(s) => upd("id", s)}
            placeholder="auto"
          />
        </Field>
        <Field
          label="Order"
          hint="Lower appears first; same value groups roles"
        >
          <NumberInput
            value={v.order}
            onChange={(n) => upd("order", n)}
            step={1}
          />
        </Field>
        <div />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Start date">
          <TextInput
            type="date"
            value={v.startDate}
            onChange={(s) => upd("startDate", s)}
          />
        </Field>
        <Field label="End date" hint="Leave empty for current">
          <TextInput
            type="date"
            value={v.endDate}
            onChange={(s) => upd("endDate", s)}
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

      <Field
        label="Company logo"
        hint="Shown next to the organization name on /experience. Square works best."
      >
        <ImageInput
          dir="experiences"
          value={v.logo || undefined}
          onChange={(url) => upd("logo", url || "")}
        />
      </Field>

      <Field label="Links">
        <LinkArrayInput value={v.links} onChange={(l) => upd("links", l)} />
      </Field>

      <Field label="Images">
        <ImageArrayInput
          value={v.images}
          onChange={(i) => upd("images", i)}
          dir="experiences"
        />
      </Field>

      <SaveBar
        saving={saving}
        error={error}
        onSave={save}
        onDelete={mode === "edit" ? destroy : undefined}
        onCancel={() => router.replace("/admin/experiences")}
      />
    </form>
  );
}
