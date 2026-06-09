"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import Markdoc from "@markdoc/markdoc";
import {
  Field,
  TextInput,
  TagInput,
  ImageInput,
  Toggle,
} from "@/components/admin/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { X } from "lucide-react";
import { diffLines, hasRealChanges, type DiffLine } from "./lib/diff";
import { lintMarkdown, offsetForLine, type LintIssue } from "./lib/lint";
import { excerptFromMarkdoc } from "@/lib/excerpt";
import { compressImageFile } from "@/lib/image-compress";

function PostHeader({
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

function ContentEditor({
  value,
  onChange,
  taRef,
}: {
  value: string;
  onChange: (s: string) => void;
  taRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const [tab, setTab] = useState<"raw" | "preview">("raw");
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const valueRef = useRef(value);
  const counterRef = useRef(0);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const rendered = useMemo(() => {
    if (tab !== "preview") return null;
    try {
      const ast = Markdoc.parse(value || "");
      const transformed = Markdoc.transform(ast);
      return Markdoc.renderers.react(transformed, React);
    } catch (e) {
      return (
        <pre className="text-xs text-red-400 whitespace-pre-wrap">
          {(e as Error).message}
        </pre>
      );
    }
  }, [tab, value]);

  const { words, readingMin } = useMemo(() => {
    const w =
      value.trim() === ""
        ? 0
        : value.trim().split(/\s+/).filter(Boolean).length;
    return { words: w, readingMin: Math.max(1, Math.ceil(w / 200)) };
  }, [value]);

  function replacePlaceholder(token: string, replacement: string) {
    const next = valueRef.current.split(token).join(replacement);
    valueRef.current = next;
    onChange(next);
  }

  async function uploadOne(rawFile: File, token: string, name: string) {
    try {
      const file = await compressImageFile(rawFile);
      const form = new FormData();
      form.append("file", file);
      form.append("dir", "posts");
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
    <Tabs value={tab} onValueChange={(v) => setTab(v as "raw" | "preview")}>
      <div className="flex items-center gap-3 mb-2">
        <TabsList className="gap-1 border border-white/10 rounded-md bg-white/[0.02]">
          <TabsTrigger
            value="raw"
            className="px-3 py-1 text-xs rounded data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-light-secondary"
          >
            Raw
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="px-3 py-1 text-xs rounded data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-light-secondary"
          >
            Preview
          </TabsTrigger>
        </TabsList>
        <span className="text-light-fourth text-[11px]">
          {words} word{words === 1 ? "" : "s"} · {readingMin} min read
        </span>
        <span className="ml-auto text-[11px] text-light-fourth">
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
      <TabsContent value="raw" className="mt-0">
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={onPaste}
          rows={20}
          className="w-full bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-lg px-3 py-2 text-sm text-white placeholder:text-light-fourth resize-y font-mono text-[12.5px]"
        />
      </TabsContent>
      <TabsContent value="preview" className="mt-0">
        <div className="min-h-[480px] rounded-md border border-white/10 bg-white/[0.02] px-4 py-3 prose prose-invert max-w-none prose-a:text-accent-primary prose-headings:text-white text-light-secondary/90">
          {rendered ?? <span className="text-xs text-light-fourth">…</span>}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function DiffOverlay({
  before,
  after,
  onClose,
}: {
  before: string;
  after: string;
  onClose: () => void;
}) {
  const lines = useMemo<DiffLine[]>(
    () => diffLines(before, after),
    [before, after],
  );
  const empty = !hasRealChanges(lines);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-lg ring-1 ring-white/10 bg-zinc-950 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Content diff</h2>
          <span className="text-[11px] text-light-fourth">
            initial → current
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto inline-flex items-center justify-center w-7 h-7 rounded-md text-light-secondary hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {empty ? (
            <p className="px-4 py-6 text-xs text-light-fourth">
              No content changes.
            </p>
          ) : (
            <pre className="font-mono text-[12.5px] whitespace-pre-wrap px-0 py-0 m-0">
              {lines.map((l, i) => {
                if (l.type === "equal") {
                  return (
                    <div key={i} className="px-4 py-[1px] text-light-fourth">
                      <span className="select-none opacity-50 mr-2"> </span>
                      {l.text || " "}
                    </div>
                  );
                }
                if (l.type === "remove") {
                  return (
                    <div
                      key={i}
                      className="px-4 py-[1px] bg-rose-500/10 text-rose-200"
                    >
                      <span className="select-none mr-2">-</span>
                      {l.text || " "}
                    </div>
                  );
                }
                return (
                  <div
                    key={i}
                    className="px-4 py-[1px] bg-emerald-500/10 text-emerald-200"
                  >
                    <span className="select-none mr-2">+</span>
                    {l.text || " "}
                  </div>
                );
              })}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function LintPanel({
  issues,
  onJump,
  onClose,
}: {
  issues: LintIssue[];
  onJump: (line: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="rounded-lg ring-1 ring-white/[0.08] bg-white/[0.02]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
        <span className="text-xs text-light-secondary">
          Lint: {issues.length} issue{issues.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close lint panel"
          className="ml-auto inline-flex items-center justify-center w-6 h-6 rounded-md text-light-fourth hover:text-white hover:bg-white/[0.06]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <ul className="max-h-60 overflow-y-auto divide-y divide-white/[0.04]">
        {issues.map((iss, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onJump(iss.line)}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/[0.04] flex items-start gap-2"
            >
              <span
                className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider shrink-0 ${
                  iss.severity === "error"
                    ? "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30"
                    : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                }`}
              >
                {iss.severity}
              </span>
              <span className="text-light-fourth shrink-0">L{iss.line}</span>
              <span className="text-light-secondary">{iss.message}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OgPreviewDrawer({
  slug,
  title,
  excerpt,
  onClose,
}: {
  slug: string;
  title: string;
  excerpt: string;
  onClose: () => void;
}) {
  const [ts] = useState(() => Date.now());
  const src = `/writing/${encodeURIComponent(slug)}/opengraph-image?ts=${ts}`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed right-0 top-12 bottom-0 w-[480px] z-50 bg-zinc-950 ring-1 ring-white/10 shadow-2xl flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white">OG preview</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ml-auto inline-flex items-center justify-center w-7 h-7 rounded-md text-light-secondary hover:text-white hover:bg-white/[0.06]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-md overflow-hidden ring-1 ring-white/[0.08] bg-black">
          <img
            src={src}
            alt="OG preview"
            width={1200}
            height={630}
            loading="lazy"
            className="block w-full h-auto"
          />
        </div>
        <div className="rounded-xl overflow-hidden ring-1 ring-white/[0.08] bg-white/[0.02]">
          <img
            src={src}
            alt=""
            loading="lazy"
            className="block w-full h-auto"
          />
          <div className="px-3 py-2">
            <div className="text-[11px] text-light-fourth lowercase">
              furkanunsalan.dev
            </div>
            <div className="text-sm text-white leading-snug mt-0.5 line-clamp-2">
              {title || "Untitled"}
            </div>
            {excerpt && (
              <div className="text-xs text-light-secondary mt-1 line-clamp-2">
                {excerpt}
              </div>
            )}
          </div>
        </div>
        <p className="text-[11px] text-light-fourth">
          Preview reflects the saved version; save changes to update.
        </p>
      </div>
    </div>
  );
}

export type PostFormValue = {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  banner: string | undefined;
  content: string;
  draft: boolean;
};

export default function PostForm({
  initial,
  mode,
  chrome,
}: {
  initial: PostFormValue;
  mode: "new" | "edit";
  chrome?: { title: string; description?: string; backHref: string };
}) {
  const router = useRouter();
  const [v, setV] = useState<PostFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [ogOpen, setOgOpen] = useState(false);
  const [lintIssues, setLintIssues] = useState<LintIssue[] | null>(null);
  const [lintClean, setLintClean] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const upd = <K extends keyof PostFormValue>(key: K, val: PostFormValue[K]) =>
    setV((cur) => ({ ...cur, [key]: val }));

  const dirty = useMemo(() => {
    if (v.slug !== initial.slug) return true;
    if (v.title !== initial.title) return true;
    if (v.date !== initial.date) return true;
    if ((v.banner || "") !== (initial.banner || "")) return true;
    if (v.content !== initial.content) return true;
    if (v.draft !== initial.draft) return true;
    if (v.tags.length !== initial.tags.length) return true;
    for (let i = 0; i < v.tags.length; i++) {
      if (v.tags[i] !== initial.tags[i]) return true;
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

  useEffect(() => {
    if (!lintClean) return;
    const t = setTimeout(() => setLintClean(false), 2000);
    return () => clearTimeout(t);
  }, [lintClean]);

  function runLint() {
    const found = lintMarkdown(v.content);
    if (found.length === 0) {
      setLintIssues(null);
      setLintClean(true);
    } else {
      setLintClean(false);
      setLintIssues(found);
    }
  }

  function jumpToLine(line: number) {
    const ta = taRef.current;
    if (!ta) return;
    const start = offsetForLine(v.content, line);
    const eol = v.content.indexOf("\n", start);
    const end = eol === -1 ? v.content.length : eol;
    ta.focus();
    ta.setSelectionRange(start, end);
    const approxLineHeight = 18;
    ta.scrollTop = Math.max(0, (line - 3) * approxLineHeight);
    ta.scrollIntoView({ block: "center", behavior: "smooth" });
  }

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

  const canDiff = mode === "edit" && dirty;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-5"
    >
      {chrome && (
        <PostHeader
          title={chrome.title}
          description={chrome.description}
          backHref={chrome.backHref}
          dirty={dirty}
          draft={v.draft}
        />
      )}

      {lintIssues && lintIssues.length > 0 && (
        <LintPanel
          issues={lintIssues}
          onJump={jumpToLine}
          onClose={() => setLintIssues(null)}
        />
      )}

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

      <Field label="Draft" hint="Drafts don't appear on /writing.">
        <Toggle
          value={v.draft}
          onChange={(b) => upd("draft", b)}
          label={v.draft ? "draft (hidden from list)" : "published"}
        />
      </Field>

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
        <ContentEditor
          value={v.content}
          onChange={(s) => upd("content", s)}
          taRef={taRef}
        />
      </Field>

      <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-8 border-t border-white/[0.06] bg-black/85 backdrop-blur px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
        {error ? (
          <span className="text-xs text-rose-400 mr-auto">{error}</span>
        ) : lintClean ? (
          <span className="text-xs text-emerald-400 mr-auto animate-pulse">
            ✓ Looks clean
          </span>
        ) : (
          <span className="mr-auto" />
        )}
        {mode === "edit" && (
          <button
            type="button"
            onClick={destroy}
            disabled={saving}
            className="rounded-lg px-3 py-1.5 text-xs ring-1 ring-rose-500/40 text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={() => router.replace("/admin/posts")}
          disabled={saving}
          className="rounded-lg px-3 py-1.5 text-xs ring-1 ring-white/[0.08] text-light-secondary hover:text-white hover:ring-white/20 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={runLint}
          disabled={saving}
          className="rounded-lg px-3 py-1.5 text-xs ring-1 ring-white/[0.08] text-light-secondary hover:text-white hover:ring-white/20 disabled:opacity-50"
        >
          Lint
        </button>
        {canDiff && (
          <button
            type="button"
            onClick={() => setShowDiff(true)}
            disabled={saving}
            className="rounded-lg px-3 py-1.5 text-xs ring-1 ring-white/[0.08] text-light-secondary hover:text-white hover:ring-white/20 disabled:opacity-50"
          >
            Show diff
          </button>
        )}
        {mode === "edit" ? (
          <button
            type="button"
            onClick={() => setOgOpen(true)}
            disabled={saving}
            className="rounded-lg px-3 py-1.5 text-xs ring-1 ring-white/[0.08] text-light-secondary hover:text-white hover:ring-white/20 disabled:opacity-50"
          >
            OG preview
          </button>
        ) : (
          <button
            type="button"
            disabled
            title="Save first to preview."
            className="rounded-lg px-3 py-1.5 text-xs ring-1 ring-white/[0.08] text-light-fourth opacity-50 cursor-not-allowed"
          >
            OG preview
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg px-3 py-1.5 text-xs bg-accent-primary/15 text-accent-primary ring-1 ring-accent-primary/40 hover:bg-accent-primary/25 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {showDiff && (
        <DiffOverlay
          before={initial.content}
          after={v.content}
          onClose={() => setShowDiff(false)}
        />
      )}

      {ogOpen && mode === "edit" && (
        <OgPreviewDrawer
          slug={initial.slug}
          title={initial.title}
          excerpt={excerptFromMarkdoc(initial.content, 28)}
          onClose={() => setOgOpen(false)}
        />
      )}
    </form>
  );
}
