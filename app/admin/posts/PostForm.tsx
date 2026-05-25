"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Field,
  TextInput,
  TextArea,
  TagInput,
  ImageInput,
  SaveBar,
} from "@/components/admin/form";

export type PostFormValue = {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  banner: string | undefined;
  content: string;
};

export default function PostForm({
  initial,
  mode,
}: {
  initial: PostFormValue;
  mode: "new" | "edit";
}) {
  const router = useRouter();
  const [v, setV] = useState<PostFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upd = <K extends keyof PostFormValue>(key: K, val: PostFormValue[K]) =>
    setV((cur) => ({ ...cur, [key]: val }));

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const url =
        mode === "new"
          ? "/api/admin/posts"
          : `/api/admin/posts/${encodeURIComponent(initial.slug)}`;
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
      router.replace("/admin/posts");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  async function destroy() {
    if (saving || mode !== "edit") return;
    if (!confirm(`Delete "${v.title}"? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/posts/${encodeURIComponent(initial.slug)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `error ${res.status}`);
        setSaving(false);
        return;
      }
      router.replace("/admin/posts");
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
      <Field label="Title">
        <TextInput value={v.title} onChange={(s) => upd("title", s)} required />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Slug"
          hint={
            mode === "new"
              ? "Leave empty to derive from title"
              : "Slug is the primary key"
          }
        >
          <TextInput
            value={v.slug}
            onChange={(s) => upd("slug", s)}
            placeholder="auto"
          />
        </Field>
        <Field label="Date">
          <TextInput
            type="date"
            value={v.date}
            onChange={(s) => upd("date", s)}
          />
        </Field>
      </div>

      <Field label="Tags">
        <TagInput value={v.tags} onChange={(t) => upd("tags", t)} />
      </Field>

      <Field label="Banner" hint="Shown on the writing list and as a hero">
        <ImageInput
          dir="posts"
          value={v.banner}
          onChange={(u) => upd("banner", u)}
        />
      </Field>

      <Field
        label="Content"
        hint="Markdoc. Use ![alt](/api/img/posts/foo.png) for inline images."
      >
        <TextArea
          value={v.content}
          onChange={(s) => upd("content", s)}
          rows={20}
          mono
        />
      </Field>

      <SaveBar
        saving={saving}
        error={error}
        onSave={save}
        onDelete={mode === "edit" ? destroy : undefined}
        onCancel={() => router.replace("/admin/posts")}
      />
    </form>
  );
}
