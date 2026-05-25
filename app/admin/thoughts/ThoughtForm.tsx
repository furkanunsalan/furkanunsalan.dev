"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import Link from "next/link";
import {
  Field,
  TagInput,
  ImageArrayInput,
  Toggle,
  SaveBar,
} from "@/components/admin/form";

function ThoughtHeader({
  title,
  description,
  backHref,
  dirty,
  draft,
}: {
  title: string;
  description?: string;
  backHref: string;
  dirty: boolean;
  draft: boolean;
}) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={backHref}
            aria-label="Back"
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
          <h1 className="text-xl font-semibold tracking-tight truncate">
            {title}
          </h1>
          {draft && (
            <span className="inline-flex items-center rounded-full px-2 py-[3px] text-[10px] leading-none uppercase tracking-wider ring-1 ring-amber-400/40 bg-amber-400/10 text-amber-300 shrink-0">
              draft
            </span>
          )}
          {dirty && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] leading-none uppercase tracking-wider ring-1 ring-amber-400/40 bg-amber-400/10 text-amber-300 shrink-0"
              title="You have unsaved changes"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              unsaved changes
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-light-fourth">{description}</p>
        )}
      </div>
    </header>
  );
}

// Paste-to-upload textarea. While each image uploads, an
// `![Uploading X…](#paste-N)` placeholder sits inline in the body; on success
// the placeholder is swapped for `![name](/api/img/thoughts/<file>)`. Failure
// swaps in `![upload failed: name](#)`.
function BodyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  const counterRef = useRef(0);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  function replacePlaceholder(token: string, replacement: string) {
    const next = valueRef.current.split(token).join(replacement);
    valueRef.current = next;
    onChange(next);
  }

  async function uploadOne(file: File, token: string, name: string) {
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("dir", "thoughts");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `error ${res.status}`);
      replacePlaceholder(token, `![${name}](${j.url})`);
    } catch (e) {
      setUploadError((e as Error).message);
      replacePlaceholder(token, `![upload failed: ${name}](#)`);
    } finally {
      setUploading((n) => Math.max(0, n - 1));
    }
  }

  async function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData?.items || []);
    const images = items.filter(
      (i) => i.kind === "file" && i.type.startsWith("image/"),
    );
    if (images.length === 0) return;
    e.preventDefault();
    setUploadError(null);

    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = valueRef.current.slice(0, start);
    const after = valueRef.current.slice(end);

    const inserts: { token: string; file: File; name: string }[] = [];
    let block = "";
    for (const item of images) {
      const file = item.getAsFile();
      if (!file) continue;
      counterRef.current += 1;
      const id = counterRef.current;
      const name =
        file.name && file.name !== "image.png" ? file.name : `pasted-${id}.png`;
      const token = `![Uploading ${name}…](#paste-${id})`;
      inserts.push({ token, file, name });
      block += (block ? "\n\n" : "") + token;
    }
    if (inserts.length === 0) return;

    const next = before + block + after;
    valueRef.current = next;
    onChange(next);

    const caret = (before + block).length;
    requestAnimationFrame(() => {
      const t = taRef.current;
      if (!t) return;
      t.focus();
      t.selectionStart = t.selectionEnd = caret;
    });

    setUploading((n) => n + inserts.length);
    for (const ins of inserts) uploadOne(ins.file, ins.token, ins.name);
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-1">
        <span className="text-[11px] text-light-fourth">
          {uploading > 0 ? (
            <>
              uploading {uploading} image{uploading === 1 ? "" : "s"}…
            </>
          ) : uploadError ? (
            <span className="text-rose-400">{uploadError}</span>
          ) : (
            "paste images to upload"
          )}
        </span>
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        rows={8}
        placeholder="What's on your mind?"
        className="w-full bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-lg px-3 py-2 text-sm text-white placeholder:text-light-fourth resize-y"
      />
    </div>
  );
}

export type ThoughtFormValue = {
  body: string;
  images: string[];
  tags: string[];
  draft: boolean;
};

export default function ThoughtForm({
  initial,
  mode,
  id,
  chrome,
}: {
  initial: ThoughtFormValue;
  mode: "new" | "edit";
  id?: number;
  chrome?: {
    title: string;
    description?: string;
    back: { href: string };
  };
}) {
  const router = useRouter();
  const [v, setV] = useState<ThoughtFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upd = <K extends keyof ThoughtFormValue>(
    key: K,
    val: ThoughtFormValue[K],
  ) => setV((cur) => ({ ...cur, [key]: val }));

  const dirty = useMemo(() => {
    if (v.body !== initial.body) return true;
    if (v.draft !== initial.draft) return true;
    if (v.tags.length !== initial.tags.length) return true;
    for (let i = 0; i < v.tags.length; i++) {
      if (v.tags[i] !== initial.tags[i]) return true;
    }
    if (v.images.length !== initial.images.length) return true;
    for (let i = 0; i < v.images.length; i++) {
      if (v.images[i] !== initial.images[i]) return true;
    }
    return false;
  }, [v, initial]);

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const url =
        mode === "new" ? "/api/admin/thoughts" : `/api/admin/thoughts/${id}`;
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
      router.replace("/admin/thoughts");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  async function destroy() {
    if (saving || mode !== "edit" || !id) return;
    if (!confirm("Delete this thought? This cannot be undone.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/thoughts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `error ${res.status}`);
        setSaving(false);
        return;
      }
      router.replace("/admin/thoughts");
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
      {chrome && (
        <ThoughtHeader
          title={chrome.title}
          description={chrome.description}
          backHref={chrome.back.href}
          dirty={dirty}
          draft={v.draft}
        />
      )}

      <Field label="Body" hint="Markdoc. Paste images to upload them inline.">
        <BodyEditor value={v.body} onChange={(s) => upd("body", s)} />
      </Field>

      <Field label="Draft" hint="Drafts don't appear on /writing.">
        <Toggle
          value={v.draft}
          onChange={(b) => upd("draft", b)}
          label={v.draft ? "draft (hidden)" : "published"}
        />
      </Field>

      <Field label="Tags">
        <TagInput value={v.tags} onChange={(t) => upd("tags", t)} />
      </Field>

      <Field
        label="Gallery images"
        hint="Shown as a grid below the body. Inline body images are separate."
      >
        <ImageArrayInput
          dir="thoughts"
          value={v.images}
          onChange={(arr) => upd("images", arr)}
        />
      </Field>

      <SaveBar
        saving={saving}
        error={error}
        onSave={save}
        onDelete={mode === "edit" ? destroy : undefined}
        onCancel={() => router.replace("/admin/thoughts")}
      />
    </form>
  );
}
