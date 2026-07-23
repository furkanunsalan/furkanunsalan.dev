"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import SmartImage from "@/components/SmartImage";

export default function ThoughtImageGallery({
  images,
  id,
}: {
  images: string[];
  id: number;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [drag, setDrag] = useState(0); // live px offset while swiping
  const activeRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef({ x: 0, w: 1 });

  const n = images.length;

  // Clamped (no wrap) so the sliding track never has to jump across the ends.
  const go = (dir: number) =>
    setOpenIndex((i) =>
      i === null ? i : Math.max(0, Math.min(n - 1, i + dir)),
    );

  useEffect(() => {
    if (openIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex, n]);

  if (n === 0) return null;

  const open = (i: number) => () => setOpenIndex(i);
  const close = () => setOpenIndex(null);

  // ---- swipe / drag ----
  const onDown = (e: React.PointerEvent) => {
    activeRef.current = true;
    movedRef.current = false;
    startRef.current = { x: e.clientX, w: e.currentTarget.clientWidth || 1 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!activeRef.current) return;
    const dx = e.clientX - startRef.current.x;
    if (Math.abs(dx) > 6) movedRef.current = true;
    setDrag(dx);
  };
  const onUp = (e: React.PointerEvent) => {
    if (!activeRef.current) return;
    activeRef.current = false;
    const dx = e.clientX - startRef.current.x;
    const w = startRef.current.w;
    if (Math.abs(dx) > w * 0.15) go(dx < 0 ? 1 : -1);
    else if (!movedRef.current) close(); // a plain tap dismisses
    setDrag(0);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };
  const onCancel = () => {
    activeRef.current = false;
    setDrag(0);
  };

  // ---- grid tiles ----
  const tile = (
    src: string,
    i: number,
    extraClass: string,
    sizes: string,
    overlay?: React.ReactNode,
  ) => (
    <button
      key={`${id}-${i}`}
      type="button"
      onClick={open(i)}
      className={`relative block bg-black overflow-hidden cursor-zoom-in w-full ${extraClass}`}
      aria-label={`Open image ${i + 1} of ${n}`}
    >
      <SmartImage
        src={src}
        alt=""
        fill
        sizes={sizes}
        className="object-cover"
      />
      {overlay}
    </button>
  );

  let grid: React.ReactNode;
  if (n === 1) {
    grid = (
      <div className="mt-3 rounded-xl overflow-hidden ring-1 ring-white/[0.06]">
        {tile(
          images[0],
          0,
          "aspect-[16/10]",
          "(max-width: 640px) 100vw, 560px",
        )}
      </div>
    );
  } else if (n === 2) {
    grid = (
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl overflow-hidden ring-1 ring-white/[0.06]">
        {images.map((src, i) => tile(src, i, "aspect-square", "280px"))}
      </div>
    );
  } else if (n === 3) {
    grid = (
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl overflow-hidden ring-1 ring-white/[0.06] h-72">
        {tile(images[0], 0, "row-span-2 h-full", "280px")}
        {tile(images[1], 1, "h-full", "280px")}
        {tile(images[2], 2, "h-full", "280px")}
      </div>
    );
  } else {
    grid = (
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl overflow-hidden ring-1 ring-white/[0.06]">
        {images
          .slice(0, 4)
          .map((src, i) =>
            tile(
              src,
              i,
              "aspect-square",
              "280px",
              i === 3 && n > 4 ? (
                <span className="absolute inset-0 grid place-items-center bg-black/50 text-white text-sm font-medium">
                  +{n - 4}
                </span>
              ) : undefined,
            ),
          )}
      </div>
    );
  }

  const idx = openIndex ?? 0;

  return (
    <>
      {grid}
      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* sliding track — tap to dismiss, drag/swipe to move */}
          <div
            className="h-full w-full touch-pan-y select-none overflow-hidden"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onCancel}
          >
            <div
              className="flex h-full will-change-transform"
              style={{
                transform: `translateX(calc(${-idx * 100}% + ${drag}px))`,
                transition: activeRef.current
                  ? "none"
                  : "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {images.map((src, i) => (
                <div
                  key={`slide-${id}-${i}`}
                  className="flex min-w-full items-center justify-center p-4 sm:p-8"
                >
                  <img
                    src={src}
                    alt=""
                    loading="eager"
                    draggable={false}
                    className="pointer-events-none max-h-[86vh] max-w-full rounded-lg object-contain"
                  />
                </div>
              ))}
            </div>
          </div>

          {n > 1 && idx > 0 && (
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white sm:left-4"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {n > 1 && idx < n - 1 && (
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white sm:right-4"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {n > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-wider text-white/60 tabular-nums">
              {idx + 1} / {n}
            </div>
          )}
        </div>
      )}
    </>
  );
}
