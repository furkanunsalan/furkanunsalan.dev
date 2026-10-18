"use client";

import { useEffect, useRef } from "react";

// Same cipher alphabet as ScrambleText, so the banner decrypts with the glyph
// vocabulary the rest of the site already uses.
const CHARS = "!<>-_\\/[]{}=+*^?#________01";

const INTRO_MS = 900;
const DECAY_MS = 260;
// Overlay pitch in px at 1x. The banner *is* ASCII art, so matching its rough
// glyph size makes the scramble read as the art's own characters resolving
// rather than a foreign layer painted on top.
const CELL_W = 7;
const CELL_H = 12;

// The ASCII banner starts as static and "decrypts" left-to-right on load, then
// re-scrambles in a radius around the pointer. Ported from ScrambleText.tsx:
// one rAF loop that mutates textContent through a ref and stops the instant the
// glyphs settle, so an idle banner costs nothing.
export default function HeroBanner({
  src,
  alt = "",
  className = "",
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const pre = preRef.current;
    if (!box || !pre) return;
    // Reduced motion: leave the banner as a plain image, no grid at all.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let cols = 0;
    let rows = 0;
    let n = 0;
    let disturb = new Float32Array(0);
    let raf = 0;
    let start = 0;
    let last = 0;
    let introDone = false;
    let lastW = 0;
    let lastH = 0;

    const glyph = () => CHARS[(Math.random() * CHARS.length) | 0];
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    // intro < 0 → settled: only pointer disturbance shows. 0..1 → the
    // left-to-right resolve. One string per frame.
    const render = (intro: number) => {
      const reveal = intro < 0 ? cols : intro * cols;
      let out = "";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          if (c < reveal - 0.5) out += " ";
          else if (disturb[i] > 0.02 && Math.random() < disturb[i])
            out += glyph();
          else out += " ";
        }
        if (r < rows - 1) out += "\n";
      }
      pre.textContent = out;
    };

    const tick = (ts: number) => {
      if (!introDone) {
        if (!start) start = ts;
        const p = Math.min(1, (ts - start) / INTRO_MS);
        // decay is 0 on the first hover frame after a settle, like
        // AsciiPortrait's `if (!hoverLast) hoverLast = ts`.
        const decay = last ? (ts - last) / DECAY_MS : 0;
        last = ts;
        for (let i = 0; i < n; i++) {
          if (disturb[i] > 0) disturb[i] = Math.max(0, disturb[i] - decay);
        }
        render(easeOut(p));
        if (p >= 1) {
          introDone = true;
          start = 0;
        }
        raf = requestAnimationFrame(tick);
        return;
      }

      const decay = last ? (ts - last) / DECAY_MS : 0;
      last = ts;
      let active = false;
      for (let i = 0; i < n; i++) {
        if (disturb[i] > 0) {
          disturb[i] = Math.max(0, disturb[i] - decay);
          if (disturb[i] > 0.02) active = true;
        }
      }
      if (active) {
        render(-1);
        raf = requestAnimationFrame(tick);
      } else {
        pre.textContent = "";
        raf = 0;
      }
    };

    const kick = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };

    const measure = () => {
      const rect = box.getBoundingClientRect();
      lastW = Math.round(rect.width);
      lastH = Math.round(rect.height);
      cols = Math.max(4, Math.round(rect.width / CELL_W));
      rows = Math.max(2, Math.round(rect.height / CELL_H));
      n = cols * rows;
      disturb = new Float32Array(n);
      // Force the grid to exactly fill the box: monospace advance ≈ 0.6em, so
      // pick the font size whose advance is one cell wide, and set the row
      // height to the cell height.
      pre.style.fontSize = `${(rect.width / cols / 0.6).toFixed(2)}px`;
      pre.style.lineHeight = `${(rect.height / rows).toFixed(2)}px`;
    };

    const onMove = (e: PointerEvent) => {
      const rect = box.getBoundingClientRect();
      if (!rect.width || !rect.height || !n) return;
      const cw = rect.width / cols;
      const ch = rect.height / rows;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const radius = Math.max(28, rect.width * 0.09);
      // Only touch the cells inside the radius' bounding box — the old
      // AsciiPortrait scanned all n glyphs per move; a banner is wide enough
      // that the local box matters.
      const c0 = Math.max(0, Math.floor((mx - radius) / cw));
      const c1 = Math.min(cols - 1, Math.ceil((mx + radius) / cw));
      const r0 = Math.max(0, Math.floor((my - radius) / ch));
      const r1 = Math.min(rows - 1, Math.ceil((my + radius) / ch));
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const dx = (c + 0.5) * cw - mx;
          const dy = (r + 0.5) * ch - my;
          const d = Math.hypot(dx, dy);
          if (d < radius) {
            const v = 1 - d / radius;
            const i = r * cols + c;
            if (v > disturb[i]) disturb[i] = v;
          }
        }
      }
      kick();
    };

    measure();
    render(0);
    raf = requestAnimationFrame(tick);

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        const rect = box.getBoundingClientRect();
        if (
          Math.round(rect.width) === lastW &&
          Math.round(rect.height) === lastH
        )
          return;
        const wasDone = introDone;
        measure();
        if (wasDone) {
          introDone = true;
          pre.textContent = "";
          raf = 0;
        } else {
          introDone = false;
          start = 0;
          last = 0;
          pre.textContent = "";
          kick();
        }
      });
      ro.observe(box);
    }

    box.addEventListener("pointermove", onMove);

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro?.disconnect();
      box.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div
      ref={boxRef}
      // The banner is pure decoration whose only hover response is the cipher
      // scramble below, so the cursor is pinned to `idle`: no View pill over an
      // image that has nothing to open. Explicit beats the image → view rule in
      // CustomCursor's resolver.
      data-cursor="idle"
      className={`relative aspect-[3/1] w-full overflow-hidden bg-zinc-950 ${className}`}
    >
      <img
        src={src}
        alt={alt}
        width={1500}
        height={500}
        draggable={false}
        className="absolute inset-0 h-full w-full select-none object-cover"
      />
      <pre
        ref={preRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 m-0 select-none overflow-hidden whitespace-pre font-mono text-indigo-400/90 mix-blend-screen"
      />
    </div>
  );
}
