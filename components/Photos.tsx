"use client";

import Masonry from "react-masonry-css";
import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo } from "@/lib/content";
import "./Photos.css";

const clean = (v: string | null) => v?.replace(/\.0$/, "") ?? null;

function Tile({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      data-loaded={loaded}
      aria-label={photo.alt || "Open photo"}
      className="photo-figure group relative mb-3 block w-full cursor-pointer overflow-hidden rounded-lg ring-1 ring-transparent transition-[box-shadow] duration-300 hover:shadow-[0_0_24px_-12px_rgba(99,102,241,0.6)] hover:ring-accent-primary/60"
      style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
    >
      <img
        src={photo.thumb}
        alt={photo.alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className="photo-img relative z-[1] h-full w-full object-cover"
      />
    </button>
  );
}

const breakpointColumnsObj = {
  default: 4,
  1100: 3,
  700: 2,
  500: 1,
};

export default function Photos({ data }: { data: Photo[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (dir: number) =>
      setOpen((i) => (i === null ? i : (i + dir + data.length) % data.length)),
    [data.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, step]);

  const active = open === null ? null : data[open];

  return (
    <div className="mx-auto mb-6 w-5/6 animate-fade-in pr-3">
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
      >
        {data.map((photo, i) => (
          <Tile key={photo.id} photo={photo} onOpen={() => setOpen(i)} />
        ))}
      </Masonry>

      {active && (
        <div
          className="fixed inset-0 z-[80] flex animate-fade-in bg-black/95 backdrop-blur-sm"
          style={{ animationDuration: "150ms" }}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-zinc-950/70 p-2 text-light-secondary transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label="Previous"
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-zinc-950/70 p-2 text-light-secondary transition-colors hover:text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label="Next"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-zinc-950/70 p-2 text-light-secondary transition-colors hover:text-white"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div
            className="m-auto flex max-h-[92vh] w-full max-w-6xl flex-col gap-5 p-4 md:flex-row md:items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex min-h-0 flex-1 items-center justify-center">
              {/* key forces the <img> to swap when navigating */}
              <img
                key={active.id}
                src={active.display}
                alt={active.alt}
                className="max-h-[82vh] w-auto max-w-full rounded-lg object-contain"
                style={{ backgroundColor: active.color }}
              />
            </div>

            <aside className="w-full shrink-0 md:w-64">
              <dl className="space-y-1.5 font-mono text-xs">
                {active.camera && <Row k="camera" v={active.camera} />}
                {clean(active.focalLength) && (
                  <Row k="focal" v={`${clean(active.focalLength)}mm`} />
                )}
                {clean(active.aperture) && (
                  <Row k="aperture" v={`ƒ/${clean(active.aperture)}`} />
                )}
                {active.shutter && <Row k="shutter" v={`${active.shutter}s`} />}
                {active.iso != null && <Row k="iso" v={String(active.iso)} />}
                {active.takenAt && (
                  <Row
                    k="date"
                    v={new Date(active.takenAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  />
                )}
              </dl>
              {active.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {active.tags.slice(0, 8).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-light-fourth"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-4 font-mono text-[11px] text-light-fourth/50">
                {open! + 1} / {data.length}
              </p>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-16 shrink-0 text-light-fourth/60">{k}</dt>
      <dd className="text-light-secondary">{v}</dd>
    </div>
  );
}
