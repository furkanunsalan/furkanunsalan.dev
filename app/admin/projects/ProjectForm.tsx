"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Field,
  TextInput,
  NumberInput,
  TextArea,
  ImageInput,
  SaveBar,
} from "@/components/admin/form";

export type ProjectFormValue = {
  slug: string;
  name: string;
  description: string;
  metric: string;
  link: string;
  language: string;
  order: number | null;
  image: string | undefined;
  content: string;
};

export default function ProjectForm({
  initial,
  mode,
}: {
  initial: ProjectFormValue;
  mode: "new" | "edit";
}) {
  const router = useRouter();
  const [v, setV] = useState<ProjectFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upd = <K extends keyof ProjectFormValue>(
    key: K,
    val: ProjectFormValue[K],
  ) => setV((cur) => ({ ...cur, [key]: val }));

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const url =
        mode === "new"
          ? "/api/admin/projects"
          : `/api/admin/projects/${encodeURIComponent(initial.slug)}`;
      const method = mode === "new" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...v,
          order: v.order ?? 100,
          language: v.language || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || `error ${res.status}`);
        setSaving(false);
        return;
      }
      router.replace("/admin/projects");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  async function destroy() {
    if (saving || mode !== "edit") return;
    if (!confirm(`Delete "${v.name}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/projects/${encodeURIComponent(initial.slug)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `error ${res.status}`);
        setSaving(false);
        return;
      }
      router.replace("/admin/projects");
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
        <Field label="Name">
          <TextInput value={v.name} onChange={(s) => upd("name", s)} required />
        </Field>
        <Field
          label="Slug"
          hint={mode === "new" ? "Auto from name if empty" : undefined}
        >
          <TextInput
            value={v.slug}
            onChange={(s) => upd("slug", s)}
            placeholder="auto"
          />
        </Field>
      </div>

      <Field label="Description">
        <TextArea
          value={v.description}
          onChange={(s) => upd("description", s)}
          rows={2}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Metric" hint="e.g. 5000+ users">
          <TextInput value={v.metric} onChange={(s) => upd("metric", s)} />
        </Field>
        <Field label="Link">
          <TextInput
            type="url"
            value={v.link}
            onChange={(s) => upd("link", s)}
          />
        </Field>
        <Field label="Language / stack">
          <TextInput value={v.language} onChange={(s) => upd("language", s)} />
        </Field>
      </div>

      <Field label="Order" hint="Lower number appears first">
        <NumberInput
          value={v.order}
          onChange={(n) => upd("order", n)}
          step={1}
        />
      </Field>

      <Field label="Image">
        <ImageInput
          dir="projects"
          value={v.image}
          onChange={(u) => upd("image", u)}
        />
      </Field>

      <Field label="Long description" hint="Markdoc">
        <TextArea
          value={v.content}
          onChange={(s) => upd("content", s)}
          rows={16}
          mono
        />
      </Field>

      <SaveBar
        saving={saving}
        error={error}
        onSave={save}
        onDelete={mode === "edit" ? destroy : undefined}
        onCancel={() => router.replace("/admin/projects")}
      />
    </form>
  );
}
