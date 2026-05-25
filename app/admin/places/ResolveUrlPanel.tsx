"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Link2, LoaderCircle, Wand2 } from "lucide-react";
import type { PlaceFormValue } from "./PlaceForm";

type Props = {
  onResolved: (patch: Partial<PlaceFormValue>) => void;
};

type Existing = { slug: string; name: string };

export default function ResolveUrlPanel({ onResolved }: Props) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [existing, setExisting] = useState<Existing | null>(null);

  async function resolve() {
    const u = url.trim();
    if (!u || pending) return;
    setPending(true);
    setError(null);
    setInfo(null);
    setExisting(null);
    try {
      const res = await fetch("/api/admin/places/resolve-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || `error ${res.status}`);
        setPending(false);
        return;
      }
      if (j.existing) {
        setExisting(j.existing);
        // Still populate so the user can compare/copy fields if they wanted
        // to update something else — but they'll most likely jump to edit.
      }
      onResolved({
        name: j.name,
        lat: j.lat,
        lng: j.lng,
        address: j.address,
        city: j.city,
        country: j.country,
        category: j.category,
        sourceUrl: j.sourceUrl || u,
      });
      if (!j.existing) {
        setInfo(
          `resolved → ${j.name} (${j.lat.toFixed(5)}, ${j.lng.toFixed(5)})`,
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-4 mb-6">
      <div className="flex items-center gap-2 mb-2 text-xs text-light-fourth">
        <Wand2 className="w-3.5 h-3.5" />
        Paste a Google Maps URL — coordinates, address, city &amp; country are
        filled automatically (via Nominatim reverse geocode).
      </div>
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-light-fourth" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                resolve();
              }
            }}
            placeholder="https://maps.app.goo.gl/… or https://www.google.com/maps/place/…"
            className="w-full bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-light-fourth"
          />
        </div>
        <button
          type="button"
          onClick={resolve}
          disabled={pending || !url.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs bg-accent-primary/15 text-accent-primary ring-1 ring-accent-primary/40 hover:bg-accent-primary/25 disabled:opacity-50 transition-colors"
        >
          {pending ? (
            <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
          ) : null}
          {pending ? "Resolving…" : "Resolve"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
      {info && <p className="mt-2 text-xs text-emerald-400">{info}</p>}
      {existing && (
        <div className="mt-3 rounded-lg ring-1 ring-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 flex items-center justify-between gap-3">
          <span>
            <strong className="text-amber-200">{existing.name}</strong> already
            exists with this slug. Saving the form would create a duplicate.
          </span>
          <Link
            href={`/admin/places/${encodeURIComponent(existing.slug)}`}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 ring-1 ring-amber-400/60 hover:bg-amber-400/15 transition-colors shrink-0"
          >
            Open existing
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
