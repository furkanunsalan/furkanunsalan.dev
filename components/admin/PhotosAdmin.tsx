"use client";

import { useRef, useState } from "react";
import { Upload, X, Pencil, Trash2, Camera } from "lucide-react";
import { Field, TextInput, TextArea, TagInput, NumberInput } from "./form";

export type PhotoRow = {
  id: string;
  order: number;
  width: number;
  height: number;
  color: string;
  alt: string;
  caption: string;
  takenAt: string | null;
  cameraMake: string | null;
  cameraModel: string | null;
  focalLength: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: number | null;
  tags: string[];
};

// EXIF-bearing formats: send the ORIGINAL bytes (no client re-encode, which
// would strip the metadata the server needs). The server makes the webp
// variants and reads the shot data.
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/tiff,image/heic,image/heif";

function cameraLabel(p: PhotoRow): string | null {
  const make = p.cameraMake?.trim();
  const model = p.cameraModel?.trim();
  if (!model) return make || null;
  if (make && !model.toLowerCase().includes(make.toLowerCase()))
    return `${make} ${model}`;
  return model;
}

const toLocalInput = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";

export default function PhotosAdmin({ initial }: { initial: PhotoRow[] }) {
  const [rows, setRows] = useState<PhotoRow[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<PhotoRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setNotice(null);
    try {
      const form = new FormData();
      for (const f of files) form.append("file", f); // raw — keep EXIF
      const res = await fetch("/api/admin/photos", {
        method: "POST",
        body: form,
      });
      const j = await res.json();
      if (!res.ok) {
        setNotice(j.error || `error ${res.status}`);
      } else {
        const created: PhotoRow[] = (j.rows ?? []).map(normalize);
        setRows((prev) => [...created, ...prev]);
        const errs: string[] = j.errors ?? [];
        setNotice(
          `Added ${created.length} photo${created.length === 1 ? "" : "s"}${
            errs.length ? ` · ${errs.length} skipped: ${errs.join("; ")}` : ""
          }`,
        );
      }
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this photo? Files are removed from the server."))
      return;
    const res = await fetch(`/api/admin/photos/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (editing?.id === id) setEditing(null);
    } else {
      const j = await res.json().catch(() => ({}));
      setNotice(j.error || `delete failed (${res.status})`);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Photos</h1>
          <p className="mt-1 text-xs text-light-fourth">
            {rows.length} photo{rows.length === 1 ? "" : "s"}. Uploads keep
            their original EXIF (camera, focal, aperture, shutter, ISO, date).
          </p>
        </div>
        <label
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-primary/15 px-3 py-1.5 text-xs text-accent-primary ring-1 ring-accent-primary/40 transition-colors hover:bg-accent-primary/25 ${
            uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "uploading…" : "Upload photos"}
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={onPick}
          />
        </label>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-light-secondary ring-1 ring-white/[0.06]">
          {notice}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl bg-zinc-950 px-4 py-16 text-center text-sm text-light-fourth ring-1 ring-white/[0.06]">
          No photos yet. Upload some to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((p) => {
            const cam = cameraLabel(p);
            return (
              <div
                key={p.id}
                className="group relative overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-white/[0.06]"
              >
                <div
                  className="relative w-full"
                  style={{
                    aspectRatio: `${p.width} / ${p.height}`,
                    backgroundColor: p.color,
                  }}
                >
                  <img
                    src={`/api/img/photos/thumb/${p.id}.webp`}
                    alt={p.alt}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-start justify-end gap-1 bg-gradient-to-b from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      aria-label="Edit"
                      className="rounded-md bg-black/70 p-1.5 text-white ring-1 ring-white/15 hover:bg-black/90"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(p.id)}
                      aria-label="Delete"
                      className="rounded-md bg-black/70 p-1.5 text-rose-300 ring-1 ring-white/15 hover:bg-black/90"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="px-2.5 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-light-secondary">
                    <Camera className="h-3 w-3 shrink-0 text-light-fourth" />
                    <span className="truncate">{cam || "no camera data"}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-light-fourth">
                    {p.takenAt
                      ? new Date(p.takenAt).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "no date"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditModal
          photo={editing}
          onClose={() => setEditing(null)}
          onSaved={(row) => {
            setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)));
            setEditing(null);
          }}
          onDelete={() => onDelete(editing.id)}
        />
      )}
    </div>
  );
}

function normalize(r: Record<string, unknown>): PhotoRow {
  return {
    id: String(r.id),
    order: Number(r.order ?? 100),
    width: Number(r.width ?? 0),
    height: Number(r.height ?? 0),
    color: String(r.color ?? "#0a0a0a"),
    alt: String(r.alt ?? ""),
    caption: String(r.caption ?? ""),
    takenAt: r.takenAt ? new Date(r.takenAt as string).toISOString() : null,
    cameraMake: (r.cameraMake as string) ?? null,
    cameraModel: (r.cameraModel as string) ?? null,
    focalLength: (r.focalLength as string) ?? null,
    aperture: (r.aperture as string) ?? null,
    shutter: (r.shutter as string) ?? null,
    iso: r.iso == null ? null : Number(r.iso),
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
  };
}

function EditModal({
  photo,
  onClose,
  onSaved,
  onDelete,
}: {
  photo: PhotoRow;
  onClose: () => void;
  onSaved: (row: PhotoRow) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<PhotoRow>(photo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof PhotoRow>(k: K, v: PhotoRow[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/photos/${encodeURIComponent(photo.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            order: draft.order,
            alt: draft.alt,
            caption: draft.caption,
            tags: draft.tags,
            cameraMake: draft.cameraMake,
            cameraModel: draft.cameraModel,
            focalLength: draft.focalLength,
            aperture: draft.aperture,
            shutter: draft.shutter,
            iso: draft.iso,
            takenAt: draft.takenAt,
          }),
        },
      );
      const j = await res.json();
      if (!res.ok) setError(j.error || `error ${res.status}`);
      else onSaved(normalize(j.row));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-zinc-950 p-5 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-sm font-semibold text-white">Edit photo</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-light-fourth hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <div>
            <img
              src={`/api/img/photos/thumb/${photo.id}.webp`}
              alt={photo.alt}
              className="w-full rounded-lg object-cover ring-1 ring-white/[0.06]"
              style={{
                aspectRatio: `${photo.width} / ${photo.height}`,
                backgroundColor: photo.color,
              }}
            />
            <p className="mt-2 break-all font-mono text-[10px] text-light-fourth/70">
              {photo.id}
            </p>
          </div>

          <div className="space-y-3">
            <Field label="Alt text">
              <TextInput
                value={draft.alt}
                onChange={(v) => set("alt", v)}
                placeholder="Describe the photo"
              />
            </Field>
            <Field label="Caption">
              <TextArea
                value={draft.caption}
                onChange={(v) => set("caption", v)}
                rows={2}
                placeholder="Optional caption"
              />
            </Field>
            <Field label="Tags">
              <TagInput
                value={draft.tags}
                onChange={(v) => set("tags", v)}
                max={12}
              />
            </Field>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Camera make">
            <TextInput
              value={draft.cameraMake ?? ""}
              onChange={(v) => set("cameraMake", v || null)}
              placeholder="Sony"
            />
          </Field>
          <Field label="Camera model">
            <TextInput
              value={draft.cameraModel ?? ""}
              onChange={(v) => set("cameraModel", v || null)}
              placeholder="ILCE-7M3"
            />
          </Field>
          <Field label="Focal length">
            <TextInput
              value={draft.focalLength ?? ""}
              onChange={(v) => set("focalLength", v || null)}
              placeholder="50.0"
            />
          </Field>
          <Field label="Aperture (ƒ)">
            <TextInput
              value={draft.aperture ?? ""}
              onChange={(v) => set("aperture", v || null)}
              placeholder="2.8"
            />
          </Field>
          <Field label="Shutter">
            <TextInput
              value={draft.shutter ?? ""}
              onChange={(v) => set("shutter", v || null)}
              placeholder="1/500"
            />
          </Field>
          <Field label="ISO">
            <NumberInput
              value={draft.iso}
              onChange={(v) => set("iso", v)}
              placeholder="100"
            />
          </Field>
          <Field label="Taken at">
            <input
              type="datetime-local"
              value={toLocalInput(draft.takenAt)}
              onChange={(e) =>
                set(
                  "takenAt",
                  e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                )
              }
              className="w-full rounded-lg border-0 bg-white/[0.04] px-3 py-2 text-sm text-white ring-1 ring-white/[0.08] focus:outline-none focus:ring-white/25"
            />
          </Field>
          <Field label="Order">
            <NumberInput
              value={draft.order}
              onChange={(v) => set("order", v ?? 100)}
            />
          </Field>
        </div>

        {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-accent-primary px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-primary/85 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-light-secondary ring-1 ring-white/[0.08] hover:text-white hover:ring-white/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-rose-300 ring-1 ring-rose-400/30 hover:bg-rose-400/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
