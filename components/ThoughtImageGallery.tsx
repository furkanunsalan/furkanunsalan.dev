"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import SmartImage from "@/components/SmartImage";

export default function ThoughtImageGallery({
  images,
  id,
}: {
  images: string[];
  id: number;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      else if (e.key === "ArrowRight") {
        setOpenIndex((i) => (i === null ? null : (i + 1) % images.length));
      } else if (e.key === "ArrowLeft") {
        setOpenIndex((i) =>
          i === null ? null : (i - 1 + images.length) % images.length,
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openIndex, images.length]);

  if (images.length === 0) return null;

  const open = (i: number) => () => setOpenIndex(i);
  const close = () => setOpenIndex(null);

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
      aria-label={`Open image ${i + 1} of ${images.length}`}
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

  const n = images.length;
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

  return (
    <>
      {grid}
      {openIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-4 right-4 rounded-full p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className="relative animate-scale-in max-w-[92vw] max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[openIndex]}
              alt=""
              width={1600}
              height={1200}
              sizes="92vw"
              className="rounded-lg object-contain max-w-[92vw] max-h-[88vh] w-auto h-auto"
            />
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-wider text-white/60 tabular-nums">
              {openIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
