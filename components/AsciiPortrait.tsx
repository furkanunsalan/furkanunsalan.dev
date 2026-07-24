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

    const rawLines = asciiPortrait.split("\n");
    const rows = rawLines.length;
    const cols = rawLines.reduce((m, l) => Math.max(m, l.length), 0);
    // The source art trims trailing blanks, so some rows are short — those
    // missing cells never get a grid index and stay a "bald spot" the shimmer
    // can't touch. Pad every non-empty row out to the full width (empty margin
    // rows stay blank) so the whole silhouette reacts. Trailing spaces are
    // invisible at rest, so this doesn't change the resting look.
    const final = rawLines
      .map((l) => (l.length > 0 ? l.padEnd(cols, " ") : l))
      .join("\n");
    const chars = final.split("");
    const n = chars.length;

    // Per-char grid coordinates (newlines flagged with row = -1) for the hover
    // math below.
    const rowOf = new Int16Array(n);
    const colOf = new Int16Array(n);
    for (let i = 0, r = 0, c = 0; i < n; i++) {
      if (chars[i] === "\n") {
        rowOf[i] = -1;
        r++;
        c = 0;
      } else {
        rowOf[i] = r;
        colOf[i] = c++;
      }
    }

    // --- intro reveal: a top-biased sparkle so the image condenses out of
    // static rather than wiping in a straight line. Newlines stay fixed. ---
    const thr = new Float32Array(n);
    for (let i = 0, row = 0; i < n; i++) {
      if (chars[i] === "\n") {
        thr[i] = -1;
        row++;
        continue;
      }
      thr[i] = (row / rows) * 0.45 + Math.random() * 0.55;
    }

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    let introRaf = 0;
    let introStart = 0;
    let introDone = false;

    const introFrame = (ts: number) => {
      if (!introStart) introStart = ts;
      const p = ease(Math.min(1, (ts - introStart) / DURATION));
      let out = "";
      for (let i = 0; i < n; i++) {
        const c = chars[i];
        out += c === "\n" ? "\n" : p >= thr[i] ? c : noise();
      }
      el.textContent = out;
      if (p < 1) introRaf = requestAnimationFrame(introFrame);
      else {
        el.textContent = final;
        introDone = true;
      }
    };

    el.textContent = final.replace(/[^\n]/g, noise);
    introRaf = requestAnimationFrame(introFrame);

    // --- hover: glyphs within a small radius of the cursor scramble, then
    // decay back to the portrait. A minimal, mouse-driven shimmer. ---
    const disturb = new Float32Array(n); // 0..1 intensity per glyph
    let hoverRaf = 0;
    let hoverLast = 0;
    let hoverActive = false;

    const render = () => {
      let out = "";
      for (let i = 0; i < n; i++) {
        const c = chars[i];
        if (c === "\n") out += "\n";
        else
          out += disturb[i] > 0.02 && Math.random() < disturb[i] ? noise() : c;
      }
      el.textContent = out;
    };

    const hoverFrame = (ts: number) => {
      if (!hoverLast) hoverLast = ts;
      const decay = (ts - hoverLast) / 260; // settle back over ~260ms
      hoverLast = ts;
      let any = false;
      for (let i = 0; i < n; i++) {
        if (disturb[i] > 0) {
          disturb[i] = Math.max(0, disturb[i] - decay);
          if (disturb[i] > 0) any = true;
        }
      }
      render();
      if (any) hoverRaf = requestAnimationFrame(hoverFrame);
      else {
        el.textContent = final;
        hoverActive = false;
        hoverLast = 0;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!introDone) return; // let the reveal finish first
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const cellW = rect.width / cols;
      const cellH = rect.height / rows;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const radius = Math.max(26, rect.width * 0.12);
      for (let i = 0; i < n; i++) {
        if (rowOf[i] < 0) continue;
        const dx = (colOf[i] + 0.5) * cellW - mx;
        const dy = (rowOf[i] + 0.5) * cellH - my;
        const d = Math.hypot(dx, dy);
        if (d < radius) {
          const v = 1 - d / radius;
          if (v > disturb[i]) disturb[i] = v;
        }
      }
      if (!hoverActive) {
        hoverActive = true;
        hoverLast = 0;
        hoverRaf = requestAnimationFrame(hoverFrame);
      }
    };

    el.addEventListener("pointermove", onMove);

    return () => {
      cancelAnimationFrame(introRaf);
      cancelAnimationFrame(hoverRaf);
      el.removeEventListener("pointermove", onMove);
    };
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
