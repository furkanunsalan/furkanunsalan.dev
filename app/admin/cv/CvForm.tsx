"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  Field,
  TextInput,
  TextArea,
  TagInput,
  Toggle,
  SaveBar,
} from "@/components/admin/form";

type Cert = { name: string; date: string };
type Lang = { name: string; level: string };
type Edu = { degree: string; dates: string; line: string; bullets: string[] };
type ProjSel = { slug: string; techStack: string; inShort: boolean };
type ExpSel = { id: string; inShort: boolean };

export type CvFormValue = {
  header: { name: string; role: string };
  contact: { address: string; phone: string; web: string };
  summary: string;
  skills: string[];
  certifications: Cert[];
  languages: Lang[];
  education: Edu[];
  projects: ProjSel[];
  experiences: ExpSel[];
};

type ExpRow = {
  id: string;
  organization: string;
  title: string;
  kind: "work" | "volunteer";
};
type ProjRow = { slug: string; name: string };

const rowInput =
  "bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-lg px-3 py-2 text-sm text-white placeholder:text-light-fourth";

export default function CvForm({
  initial,
  availableExperiences,
  availableProjects,
}: {
  initial: CvFormValue;
  availableExperiences: ExpRow[];
  availableProjects: ProjRow[];
}) {
  const router = useRouter();
  const [v, setV] = useState<CvFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upd = <K extends keyof CvFormValue>(k: K, val: CvFormValue[K]) =>
    setV((cur) => ({ ...cur, [k]: val }));

  // --- selection helpers
  const expSel = (id: string) => v.experiences.find((e) => e.id === id);
  const toggleExp = (id: string) =>
    upd(
      "experiences",
      expSel(id)
        ? v.experiences.filter((e) => e.id !== id)
        : [...v.experiences, { id, inShort: false }],
    );
  const setExpShort = (id: string, inShort: boolean) =>
    upd(
      "experiences",
      v.experiences.map((e) => (e.id === id ? { ...e, inShort } : e)),
    );

  const projSel = (slug: string) => v.projects.find((p) => p.slug === slug);
  const toggleProj = (slug: string) =>
    upd(
      "projects",
      projSel(slug)
        ? v.projects.filter((p) => p.slug !== slug)
        : [...v.projects, { slug, techStack: "", inShort: false }],
    );
  const setProj = (slug: string, patch: Partial<ProjSel>) =>
    upd(
      "projects",
      v.projects.map((p) => (p.slug === slug ? { ...p, ...patch } : p)),
    );

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cv", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(v),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `error ${res.status}`);
        setSaving(false);
        return;
      }
      setSaving(false);
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
      className="space-y-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <TextInput
            value={v.header.name}
            onChange={(s) => upd("header", { ...v.header, name: s })}
          />
        </Field>
        <Field label="Role">
          <TextInput
            value={v.header.role}
            onChange={(s) => upd("header", { ...v.header, role: s })}
          />
        </Field>
        <Field label="Address">
          <TextInput
            value={v.contact.address}
            onChange={(s) => upd("contact", { ...v.contact, address: s })}
          />
        </Field>
        <Field label="Phone">
          <TextInput
            value={v.contact.phone}
            onChange={(s) => upd("contact", { ...v.contact, phone: s })}
          />
        </Field>
        <Field label="Web">
          <TextInput
            value={v.contact.web}
            onChange={(s) => upd("contact", { ...v.contact, web: s })}
          />
        </Field>
      </div>
      <p className="text-xs text-light-fourth">
        E-mail, Github and Linkedin are pulled from the Home page socials.
      </p>

      <Field label="Summary">
        <TextArea
          value={v.summary}
          onChange={(s) => upd("summary", s)}
          rows={4}
        />
      </Field>

      <Field label="Skills">
        <TagInput
          value={v.skills}
          onChange={(s) => upd("skills", s)}
          placeholder="Add skill, press Enter"
        />
      </Field>

      <Field label="Certifications" hint="Name + date (e.g. Apr 2025)">
        <RowList
          rows={v.certifications}
          cols={["name", "date"] as const}
          placeholders={["Certification name", "Apr 2025"]}
          onChange={(rows) => upd("certifications", rows as Cert[])}
          blank={{ name: "", date: "" }}
          addLabel="Add certification"
        />
      </Field>

      <Field label="Languages" hint="Language + proficiency">
        <RowList
          rows={v.languages}
          cols={["name", "level"] as const}
          placeholders={["Language", "Full Working Proficiency"]}
          onChange={(rows) => upd("languages", rows as Lang[])}
          blank={{ name: "", level: "" }}
          addLabel="Add language"
        />
      </Field>

      <Field label="Education">
        <div className="space-y-3">
          {v.education.map((e, i) => (
            <div
              key={i}
              className="space-y-2 rounded-lg ring-1 ring-white/[0.06] p-3"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={e.degree}
                  onChange={(ev) => {
                    const next = [...v.education];
                    next[i] = { ...e, degree: ev.target.value };
                    upd("education", next);
                  }}
                  placeholder="Degree"
                  className={rowInput}
                />
                <input
                  value={e.dates}
                  onChange={(ev) => {
                    const next = [...v.education];
                    next[i] = { ...e, dates: ev.target.value };
                    upd("education", next);
                  }}
                  placeholder="Sep 2024 - 2027 (Expected)"
                  className={rowInput}
                />
              </div>
              <input
                value={e.line}
                onChange={(ev) => {
                  const next = [...v.education];
                  next[i] = { ...e, line: ev.target.value };
                  upd("education", next);
                }}
                placeholder="School - location - GPA"
                className={`${rowInput} w-full`}
              />
              <textarea
                value={e.bullets.join("\n")}
                onChange={(ev) => {
                  const next = [...v.education];
                  next[i] = { ...e, bullets: ev.target.value.split("\n") };
                  upd("education", next);
                }}
                placeholder="One bullet per line"
                rows={2}
                className={`${rowInput} w-full`}
              />
              <button
                type="button"
                onClick={() =>
                  upd(
                    "education",
                    v.education.filter((_, j) => j !== i),
                  )
                }
                className="inline-flex items-center gap-1 text-xs text-light-fourth hover:text-white"
              >
                <X className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              upd("education", [
                ...v.education,
                { degree: "", dates: "", line: "", bullets: [] },
              ])
            }
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-light-fourth ring-1 ring-white/[0.08] hover:text-white hover:ring-white/20"
          >
            <Plus className="h-3.5 w-3.5" /> Add education
          </button>
        </div>
      </Field>

      <Field
        label="Experiences"
        hint="Pick which roles appear; the Work/Volunteering section comes from each role's kind. ✓ Short = include in the short résumé."
      >
        <div className="space-y-1.5">
          {availableExperiences.map((e) => {
            const sel = expSel(e.id);
            return (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 ring-1 ring-white/[0.06]"
              >
                <input
                  type="checkbox"
                  checked={!!sel}
                  onChange={() => toggleExp(e.id)}
                  className="accent-accent-primary"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-white">
                  {e.organization} — {e.title}
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-light-fourth">
                    {e.kind}
                  </span>
                </span>
                {sel && (
                  <Toggle
                    value={sel.inShort}
                    onChange={(b) => setExpShort(e.id, b)}
                    label="Short"
                  />
                )}
              </div>
            );
          })}
        </div>
      </Field>

      <Field
        label="Projects"
        hint="Pick projects, add a Tech Stack line, ✓ Short to include in the short résumé."
      >
        <div className="space-y-1.5">
          {availableProjects.map((p) => {
            const sel = projSel(p.slug);
            return (
              <div
                key={p.slug}
                className="rounded-md px-2 py-1.5 ring-1 ring-white/[0.06]"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!sel}
                    onChange={() => toggleProj(p.slug)}
                    className="accent-accent-primary"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-white">
                    {p.name}
                  </span>
                  {sel && (
                    <Toggle
                      value={sel.inShort}
                      onChange={(b) => setProj(p.slug, { inShort: b })}
                      label="Short"
                    />
                  )}
                </div>
                {sel && (
                  <input
                    value={sel.techStack}
                    onChange={(ev) =>
                      setProj(p.slug, { techStack: ev.target.value })
                    }
                    placeholder="Tech Stack: Next.js, Tailwind, ..."
                    className={`${rowInput} mt-2 w-full`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Field>

      <SaveBar saving={saving} error={error} onSave={save} />
    </form>
  );
}

function RowList<C extends readonly string[]>({
  rows,
  cols,
  placeholders,
  onChange,
  blank,
  addLabel,
}: {
  rows: Record<string, string>[];
  cols: C;
  placeholders: string[];
  onChange: (rows: Record<string, string>[]) => void;
  blank: Record<string, string>;
  addLabel: string;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          {cols.map((col, ci) => (
            <input
              key={col}
              value={row[col] ?? ""}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, [col]: e.target.value };
                onChange(next);
              }}
              placeholder={placeholders[ci]}
              className={`${rowInput} ${ci === 0 ? "flex-[1_1_60%]" : "flex-[1_1_30%]"}`}
            />
          ))}
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
            className="rounded-md p-1.5 text-light-fourth hover:bg-white/[0.06] hover:text-white"
            aria-label="remove"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { ...blank }])}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-light-fourth ring-1 ring-white/[0.08] hover:text-white hover:ring-white/20"
      >
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </button>
    </div>
  );
}
