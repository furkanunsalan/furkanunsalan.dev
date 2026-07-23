"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  Field,
  TextInput,
  TextArea,
  Select,
  SaveBar,
} from "@/components/admin/form";

const ICON_OPTIONS = [
  "github",
  "linkedin",
  "mail",
  "cv",
  "medium",
  "rss",
  "x",
  "youtube",
  "instagram",
  "mastodon",
  "bluesky",
  "globe",
] as const;

type Icon = (typeof ICON_OPTIONS)[number];

export type Social = { name: string; url: string; icon: Icon };

export type HomeFormValue = {
  intro: string;
  location: string;
  focus: string;
  watching: string;
  timezone: string;
  timezoneLabel: string;
  pgpId: string;
  socials: Social[];
};

export default function HomeSettingsForm({
  initial,
}: {
  initial: HomeFormValue;
}) {
  const router = useRouter();
  const [v, setV] = useState<HomeFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upd = <K extends keyof HomeFormValue>(k: K, val: HomeFormValue[K]) =>
    setV((cur) => ({ ...cur, [k]: val }));

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/home", {
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
      className="space-y-5"
    >
      <Field label="Intro paragraph">
        <TextArea value={v.intro} onChange={(s) => upd("intro", s)} rows={5} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Location" hint="e.g. Istanbul, TR — the “based” row">
          <TextInput value={v.location} onChange={(s) => upd("location", s)} />
        </Field>
        <Field label="Focus" hint="middot-separated, e.g. full-stack · privacy">
          <TextInput value={v.focus} onChange={(s) => upd("focus", s)} />
        </Field>
        <Field label="Watching" hint="the “watching” row">
          <TextInput value={v.watching} onChange={(s) => upd("watching", s)} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Timezone (IANA)">
          <TextInput value={v.timezone} onChange={(s) => upd("timezone", s)} />
        </Field>
        <Field label="Timezone label">
          <TextInput
            value={v.timezoneLabel}
            onChange={(s) => upd("timezoneLabel", s)}
          />
        </Field>
        <Field label="PGP key ID" hint="Leave empty to hide">
          <TextInput value={v.pgpId} onChange={(s) => upd("pgpId", s)} />
        </Field>
      </div>

      <Field label="Socials">
        <div className="space-y-2">
          {v.socials.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={s.name}
                onChange={(e) => {
                  const next = [...v.socials];
                  next[i] = { ...s, name: e.target.value };
                  upd("socials", next);
                }}
                placeholder="Name"
                className="bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-lg px-3 py-2 text-sm text-white placeholder:text-light-fourth flex-[1_1_25%]"
              />
              <input
                value={s.url}
                onChange={(e) => {
                  const next = [...v.socials];
                  next[i] = { ...s, url: e.target.value };
                  upd("socials", next);
                }}
                placeholder="https://"
                className="bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-lg px-3 py-2 text-sm text-white placeholder:text-light-fourth flex-[1_1_50%]"
              />
              <div className="flex-[0_0_120px]">
                <Select
                  value={s.icon}
                  onChange={(icon) => {
                    const next = [...v.socials];
                    next[i] = { ...s, icon };
                    upd("socials", next);
                  }}
                  options={ICON_OPTIONS.map((i) => ({ value: i, label: i }))}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  upd(
                    "socials",
                    v.socials.filter((_, j) => j !== i),
                  )
                }
                className="rounded-md p-1.5 text-light-fourth hover:text-white hover:bg-white/[0.06]"
                aria-label="remove"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              upd("socials", [
                ...v.socials,
                { name: "", url: "", icon: "globe" as Icon },
              ])
            }
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-light-fourth ring-1 ring-white/[0.08] hover:text-white hover:ring-white/20"
          >
            <Plus className="w-3.5 h-3.5" /> Add social
          </button>
        </div>
      </Field>

      <SaveBar saving={saving} error={error} onSave={save} />
    </form>
  );
}
