"use client";

import { Link } from "@/components/_compat";
import { X, Plus, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { compressImageFile } from "@/lib/image-compress";

// ---- shared style tokens ----
const FIELD_CLASS =
  "w-full bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-lg px-3 py-2 text-sm text-white placeholder:text-light-fourth";

// ---------------- Field wrapper ----------------

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-xs text-light-secondary">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-light-fourth">{hint}</p>}
    </div>
  );
}

// ---------------- Inputs ----------------

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  id,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "url" | "email" | "date";
  id?: string;
  required?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={FIELD_CLASS}
    />
  );
}

// Free-text input with a chevron that toggles a dropdown of existing values.
// Typing alone does NOT surface suggestions — the user has to deliberately open
// the picker, which keeps quick text entry friction-free.
export function ComboInput({
  value,
  onChange,
  options,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <div className="flex items-stretch w-full bg-black ring-1 ring-white/[0.08] focus-within:ring-accent-primary/60 rounded-lg overflow-hidden">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1 bg-transparent outline-none px-3 py-2 text-sm text-white placeholder:text-light-fourth"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={options.length === 0}
          className="px-2 text-light-fourth hover:text-white border-l border-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="pick existing"
          title={
            options.length === 0 ? "No existing values yet" : "Pick existing"
          }
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
      {open && options.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 rounded-lg ring-1 ring-white/10 bg-zinc-950 shadow-2xl max-h-64 overflow-y-auto py-1">
          {options.map((o) => {
            const active = o === value;
            return (
              <button
                key={o}
                type="button"
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-accent-primary/15 text-accent-primary"
                    : "text-light-secondary hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  step,
  id,
  placeholder,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  step?: number;
  id?: string;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      type="number"
      step={step}
      value={value === null || value === undefined ? "" : value}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? null : Number(v));
      }}
      placeholder={placeholder}
      className={FIELD_CLASS}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 6,
  placeholder,
  id,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  id?: string;
  mono?: boolean;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={`${FIELD_CLASS} resize-y ${mono ? "font-mono text-[12.5px]" : ""}`}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  id,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  id?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={FIELD_CLASS}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          value ? "bg-accent-primary" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            value ? "translate-x-4" : ""
          }`}
        />
      </span>
      <span className="text-sm text-white">{label}</span>
    </label>
  );
}

// ---------------- Tag (string[]) ----------------

export function TagInput({
  value,
  onChange,
  placeholder = "Add tag, press Enter",
  id,
  max,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  id?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");
  const atLimit = typeof max === "number" && value.length >= max;
  const add = useCallback(
    (raw: string) => {
      const t = raw.trim();
      if (!t || value.includes(t)) return;
      if (atLimit) return;
      onChange([...value, t]);
    },
    [value, onChange, atLimit],
  );
  return (
    <div className="flex flex-wrap items-center gap-1.5 bg-black ring-1 ring-white/[0.08] focus-within:ring-accent-primary/60 rounded-lg px-2 py-1.5">
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] text-xs px-2 py-0.5"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="text-light-fourth hover:text-white"
            aria-label={`remove ${t}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
            setDraft("");
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => {
          if (draft.trim()) {
            add(draft);
            setDraft("");
          }
        }}
        placeholder={
          atLimit ? `max ${max} reached` : value.length ? "" : placeholder
        }
        disabled={atLimit}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-white placeholder:text-light-fourth py-1 disabled:cursor-not-allowed"
      />
    </div>
  );
}

// ---------------- Array of {label, url} ----------------

export type LabelUrl = { label: string; url: string };

export function LinkArrayInput({
  value,
  onChange,
}: {
  value: LabelUrl[];
  onChange: (v: LabelUrl[]) => void;
}) {
  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={row.label}
            onChange={(e) => {
              const next = [...value];
              next[i] = { ...row, label: e.target.value };
              onChange(next);
            }}
            placeholder="Label"
            className={`${FIELD_CLASS} flex-[1_1_30%]`}
          />
          <input
            value={row.url}
            onChange={(e) => {
              const next = [...value];
              next[i] = { ...row, url: e.target.value };
              onChange(next);
            }}
            placeholder="https://"
            className={`${FIELD_CLASS} flex-[1_1_60%]`}
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="rounded-md p-1.5 text-light-fourth hover:text-white hover:bg-white/[0.06]"
            aria-label="remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { label: "", url: "" }])}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-light-fourth ring-1 ring-white/[0.08] hover:text-white hover:ring-white/20"
      >
        <Plus className="w-3.5 h-3.5" /> Add link
      </button>
    </div>
  );
}

// ---------------- Array of image paths ----------------

export function ImageArrayInput({
  value,
  onChange,
  dir,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  dir: "posts" | "projects" | "experiences" | "places" | "thoughts" | "misc";
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {value.map((url, i) => (
        <div key={i} className="flex items-center gap-2">
          {url && (
            <img
              src={url}
              alt=""
              loading="lazy"
              className="w-10 h-10 rounded-md object-cover bg-zinc-900 ring-1 ring-white/[0.06]"
            />
          )}
          <input
            value={url}
            onChange={(e) => {
              const next = [...value];
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder="/path/to/image.png or /api/img/..."
            className={`${FIELD_CLASS} flex-1`}
          />
          {value.length > 1 && (
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => move(i, i - 1)}
                disabled={i === 0}
                className="rounded-md p-0.5 text-light-fourth hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="move up"
                title="Move earlier"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={i === value.length - 1}
                className="rounded-md p-0.5 text-light-fourth hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="move down"
                title="Move later"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="rounded-md p-1.5 text-light-fourth hover:text-white hover:bg-white/[0.06]"
            aria-label="remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <ImageInput
        dir={dir}
        onUpload={(url) => onChange([...value, url])}
        label="Upload image"
      />
    </div>
  );
}

// ---------------- Single image upload ----------------

export function ImageInput({
  value,
  onChange,
  onUpload,
  dir,
  label = "Choose image",
}: {
  value?: string;
  onChange?: (v: string | undefined) => void;
  onUpload?: (url: string) => void;
  dir: "posts" | "projects" | "experiences" | "places" | "thoughts" | "misc";
  label?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setPending(true);
    setError(null);
    try {
      const file = await compressImageFile(picked);
      const form = new FormData();
      form.append("file", file);
      form.append("dir", dir);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || `error ${res.status}`);
      } else {
        if (onChange) onChange(j.url);
        if (onUpload) onUpload(j.url);
      }
    } catch (e2) {
      setError((e2 as Error).message);
    } finally {
      setPending(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {value && (
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt=""
            loading="lazy"
            className="h-16 w-auto rounded-md object-cover bg-zinc-900 ring-1 ring-white/[0.06]"
          />
          <button
            type="button"
            onClick={() => onChange?.(undefined)}
            className="text-xs text-light-fourth hover:text-rose-400 transition-colors"
          >
            Remove
          </button>
        </div>
      )}
      {value && onChange && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={FIELD_CLASS}
          placeholder="Image URL"
        />
      )}
      <label
        htmlFor={id}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ring-1 ring-white/[0.08] hover:ring-white/20 cursor-pointer ${
          pending ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        <Plus className="w-3.5 h-3.5" />
        {pending ? "uploading…" : label}
      </label>
      <input
        ref={ref}
        id={id}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

// ---------------- Save bar ----------------

export function SaveBar({
  saving,
  error,
  onSave,
  onDelete,
  onCancel,
  saveLabel = "Save",
}: {
  saving: boolean;
  error?: string | null;
  onSave: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-8 border-t border-white/[0.06] bg-black/85 backdrop-blur px-4 sm:px-6 py-3 flex items-center gap-3">
      {error && <span className="text-xs text-rose-400 mr-auto">{error}</span>}
      {!error && <span className="mr-auto" />}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={saving}
          className="rounded-lg px-3 py-1.5 text-xs ring-1 ring-rose-500/40 text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
        >
          Delete
        </button>
      )}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-3 py-1.5 text-xs ring-1 ring-white/[0.08] text-light-secondary hover:text-white hover:ring-white/20 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-lg px-3 py-1.5 text-xs bg-accent-primary/15 text-accent-primary ring-1 ring-accent-primary/40 hover:bg-accent-primary/25 disabled:opacity-50"
      >
        {saving ? "Saving…" : saveLabel}
      </button>
    </div>
  );
}

// ---------------- Listing helpers ----------------

export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  back?: { href: string; label?: string };
}) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {back && <BackLink href={back.href} label={back.label} />}
          <h1 className="text-xl font-semibold tracking-tight truncate">
            {title}
          </h1>
        </div>
        {description && (
          <p className="mt-1 text-xs text-light-fourth">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}

function BackLink({ href, label }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label || "Back"}
      className="inline-flex items-center justify-center w-7 h-7 rounded-md ring-1 ring-white/[0.08] text-light-secondary hover:text-white hover:ring-white/20 transition-colors shrink-0"
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  );
}
