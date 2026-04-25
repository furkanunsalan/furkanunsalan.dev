"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type Heading = { id: string; text: string; level: number };

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const listRef = useRef<HTMLUListElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [marker, setMarker] = useState({
    top: 0,
    height: 0,
    left: 0,
    visible: false,
  });

  useEffect(() => {
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    const observed: Element[] = [];
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) {
        observer.observe(el);
        observed.push(el);
      }
    });
    return () => observed.forEach((el) => observer.unobserve(el));
  }, [headings]);

  useIso(() => {
    function measure() {
      const track = trackRef.current;
      const link = linkRefs.current.get(activeId);
      if (!track || !link) {
        setMarker((m) => ({ ...m, visible: false }));
        return;
      }
      const tRect = track.getBoundingClientRect();
      const lRect = link.getBoundingClientRect();
      setMarker({
        top: lRect.top - tRect.top,
        height: lRect.height,
        left: lRect.left - tRect.left,
        visible: true,
      });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeId, headings]);

  if (!headings.length) return null;

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <nav aria-label="Table of contents" className="sticky top-24">
      <p className="font-mono text-[10px] uppercase tracking-widest text-light-fourth mb-3">
        On this post
      </p>
      <div ref={trackRef} className="relative">
        {/* Single sliding accent indicator (slides vertically AND horizontally) */}
        <div
          className="absolute w-px bg-accent-primary transition-all duration-300 ease-out"
          style={{
            top: marker.top,
            height: marker.height,
            left: marker.left,
            opacity: marker.visible ? 1 : 0,
          }}
        />
        <ul ref={listRef} className="text-sm space-y-1.5">
          {headings.map((h) => {
            const indent = (h.level - minLevel) * 0.75;
            const active = activeId === h.id;
            return (
              <li key={h.id} style={{ paddingLeft: `${indent}rem` }}>
                <a
                  ref={(el) => {
                    if (el) linkRefs.current.set(h.id, el);
                    else linkRefs.current.delete(h.id);
                  }}
                  href={`#${h.id}`}
                  className={`block leading-snug pl-3 border-l border-white/[0.06] transition-colors ${
                    active
                      ? "text-accent-primary"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {h.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
