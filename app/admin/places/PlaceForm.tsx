"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Field,
  TextInput,
  NumberInput,
  TextArea,
  Select,
  TagInput,
  ComboInput,
  SaveBar,
} from "@/components/admin/form";

export type PlaceFormValue = {
  slug: string;
  name: string;
  lat: number | null;
  lng: number | null;
  address: string;
  list: string;
  category: string;
  city: string;
  country: string;
  status: "want-to-go" | "been" | "favorite";
  sourceUrl: string;
  notes: string;
  tags: string[];
  addedAt: string; // ISO 8601 (datetime-local-ish), optional
};

export default function PlaceForm({
  initial,
  mode,
  lists,
  categories = [],
}: {
  initial: PlaceFormValue;
  mode: "new" | "edit";
  lists: { name: string; icon: string }[];
  categories?: string[];
}) {
  const router = useRouter();
  const [v, setV] = useState<PlaceFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upd = <K extends keyof PlaceFormValue>(
    key: K,
    val: PlaceFormValue[K],
  ) => setV((cur) => ({ ...cur, [key]: val }));

  async function save() {
    if (saving) return;
    // Guard against accidentally saving (0,0) — Null Island off the coast of
    // Africa — when the user blanks lat/lng. Coercing to 0 silently was the
    // old behavior and produced bad map pins.
    if (v.lat === null || v.lng === null) {
      setError("latitude and longitude are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url =
        mode === "new"
          ? "/api/admin/places"
          : `/api/admin/places/${encodeURIComponent(initial.slug)}`;
      const method = mode === "new" ? "POST" : "PATCH";
      const body = { ...v, lat: v.lat, lng: v.lng };
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || `error ${res.status}`);
        setSaving(false);
        return;
      }
      router.replace("/admin/places");
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
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/places/${encodeURIComponent(initial.slug)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `error ${res.status}`);
        setSaving(false);
        return;
      }
      router.replace("/admin/places");
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
          hint={
            mode === "new"
              ? "Leave empty to derive from name"
              : "Slug is the primary key — change requires re-creating the row"
          }
        >
          <TextInput
            value={v.slug}
            onChange={(s) => upd("slug", s)}
            placeholder="auto"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Latitude">
          <NumberInput
            value={v.lat}
            onChange={(n) => upd("lat", n)}
            step={0.000001}
          />
        </Field>
        <Field label="Longitude">
          <NumberInput
            value={v.lng}
            onChange={(n) => upd("lng", n)}
            step={0.000001}
          />
        </Field>
      </div>

      <Field label="Address">
        <TextArea
          value={v.address}
          onChange={(s) => upd("address", s)}
          rows={2}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="City">
          <TextInput value={v.city} onChange={(s) => upd("city", s)} />
        </Field>
        <Field label="Country">
          <TextInput value={v.country} onChange={(s) => upd("country", s)} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Status">
          <Select
            value={v.status}
            onChange={(s) => upd("status", s)}
            options={[
              { value: "want-to-go", label: "Want to go" },
              { value: "been", label: "Been there" },
              { value: "favorite", label: "Favorite" },
            ]}
          />
        </Field>
        <Field
          label="List"
          hint={
            lists.length === 0
              ? "No lists yet — add one under Settings → Place lists"
              : "Drives the filter chips on /places"
          }
        >
          <Select
            value={v.list}
            onChange={(s) => upd("list", s)}
            options={[
              { value: "", label: "— none —" },
              ...lists.map((l) => ({ value: l.name, label: l.name })),
            ]}
          />
        </Field>
      </div>

      <Field
        label="Category"
        hint="e.g. cafe, restaurant, museum — picks up existing values"
      >
        <ComboInput
          value={v.category}
          onChange={(s) => upd("category", s)}
          options={categories}
        />
      </Field>

      <Field label="Tags" hint="Up to 3">
        <TagInput value={v.tags} onChange={(t) => upd("tags", t)} max={3} />
      </Field>

      <Field label="Added at" hint="ISO 8601. Drives default list sort.">
        <TextInput value={v.addedAt} onChange={(s) => upd("addedAt", s)} />
      </Field>

      <Field label="Source URL" hint="Original Google Maps URL or similar">
        <TextInput
          value={v.sourceUrl}
          onChange={(s) => upd("sourceUrl", s)}
          type="url"
        />
      </Field>

      <Field label="Notes">
        <TextArea value={v.notes} onChange={(s) => upd("notes", s)} rows={4} />
      </Field>

      <SaveBar
        saving={saving}
        error={error}
        onSave={save}
        onDelete={mode === "edit" ? destroy : undefined}
        onCancel={() => router.replace("/admin/places")}
      />
    </form>
  );
}
