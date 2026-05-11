"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type ImgChild = { src: string; alt?: string };

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function Row({
  images,
  onOpen,
}: {
  images: ImgChild[];
  onOpen: (src: string) => void;
}) {
  if (images.length === 1) {
    const img = images[0];
    return (
      <div
        className="image-skeleton relative w-full aspect-[16/9] overflow-hidden rounded-xl cursor-zoom-in border border-white/[0.06] transition-all duration-300 hover:border-accent-primary/60 hover:shadow-[0_0_24px_-12px_rgba(99,102,241,0.6)]"
        onClick={() => onOpen(img.src)}
      >
        <Image
          src={img.src}
          alt={img.alt || ""}
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
        />
      </div>
    );
  }

  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {images.map((img, i) => (
          <div
            key={i}
            className="image-skeleton relative aspect-square overflow-hidden rounded-xl cursor-zoom-in border border-white/[0.06] transition-all duration-300 hover:border-accent-primary/60 hover:shadow-[0_0_24px_-12px_rgba(99,102,241,0.6)]"
            onClick={() => onOpen(img.src)}
          >
            <Image
              src={img.src}
              alt={img.alt || ""}
              fill
              sizes="(max-width: 768px) 50vw, 384px"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    );
  }

  // 3 images — bento: one tall hero on the left, two stacked on the right
  const [hero, a, b] = images;
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-2 aspect-[16/10]">
      <div
        className="image-skeleton relative row-span-2 overflow-hidden rounded-xl cursor-zoom-in border border-white/[0.06] transition-all duration-300 hover:border-accent-primary/60 hover:shadow-[0_0_24px_-12px_rgba(99,102,241,0.6)]"
        onClick={() => onOpen(hero.src)}
      >
        <Image
          src={hero.src}
          alt={hero.alt || ""}
          fill
          sizes="(max-width: 768px) 50vw, 384px"
          className="object-cover"
        />
      </div>
      {[a, b].map((img, i) => (
        <div
          key={i}
          className="image-skeleton relative overflow-hidden rounded-xl cursor-zoom-in border border-white/[0.06] transition-all duration-300 hover:border-accent-primary/60 hover:shadow-[0_0_24px_-12px_rgba(99,102,241,0.6)]"
          onClick={() => onOpen(img.src)}
        >
          <Image
            src={img.src}
            alt={img.alt || ""}
            fill
            sizes="(max-width: 768px) 50vw, 384px"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}

export default function PostBentoImages({ images }: { images: ImgChild[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const rows = chunk(images, 3);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="not-prose my-6 space-y-6">
      {rows.map((row, i) => (
        <Row key={i} images={row} onOpen={setOpen} />
      ))}
      {open && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setOpen(null)}
        >
          <div className="animate-scale-in">
            <Image
              src={open}
              alt="Expanded image"
              width={1600}
              height={1000}
              className="rounded-lg max-w-[92vw] max-h-[88vh] w-auto h-auto"
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
