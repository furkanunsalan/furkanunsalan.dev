"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { asciiPortrait, asciiPortraitAlt } from "@/data/asciiPortrait";

// useLayoutEffect on the client (swap to scrambled text before first paint so
// the finished portrait never flashes), useEffect on the server to stay quiet.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const SCRAMBLE = "@%#*+=~-:.01/\\|<>";
const DURATION = 1500;

const noise = () => SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];

export default function AsciiPortrait({
  className = "",
}: {
  className?: string;
}) {
  const ref = useRef<HTMLPreElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const final = asciiPortrait;
    const n = final.length;
    const rows = final.split("\n").length;

    // Per-glyph reveal thresholds: a top-biased sparkle so the image condenses
    // out of static rather than wiping in a straight line. Newlines stay fixed.
    const thr = new Float32Array(n);
    let row = 0;
    for (let i = 0; i < n; i++) {
      if (final[i] === "\n") {
        thr[i] = -1;
        row++;
        continue;
      }
      thr[i] = (row / rows) * 0.45 + Math.random() * 0.55;
    }

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    let raf = 0;
    let start = 0;

    const frame = (ts: number) => {
      if (!start) start = ts;
      const p = ease(Math.min(1, (ts - start) / DURATION));
      let out = "";
      for (let i = 0; i < n; i++) {
        const c = final[i];
        out += c === "\n" ? "\n" : p >= thr[i] ? c : noise();
      }
      el.textContent = out;
      if (p < 1) raf = requestAnimationFrame(frame);
      else el.textContent = final;
    };

    el.textContent = final.replace(/[^\n]/g, noise);
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <pre
      ref={ref}
      role="img"
      aria-label={asciiPortraitAlt}
      className={`m-0 shrink-0 select-none whitespace-pre font-mono leading-[1.18] text-[calc((100vw_-_2rem)/61)] text-light-secondary/80 sm:text-[3.6px] lg:text-[4.2px] ${className}`}
      style={{ textShadow: "0 0 6px rgba(99, 102, 241, 0.12)" }}
    >
      {asciiPortrait}
    </pre>
  );
}
