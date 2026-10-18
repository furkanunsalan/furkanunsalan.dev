"use client";

import { useEffect, useRef } from "react";
import {
  coastAlt,
  coastBackground,
  coastCellAspect,
  coastCols,
  coastColorIndices,
  coastGlow,
  coastGlyphs,
  coastIndexAlphabet,
  coastNoise,
  coastPalette,
  coastRows,
} from "@/data/coastFooter";

// Decorative coast cipher band. Two layers exist so the band is never empty:
// the SSR `<pre>` below is the no-JS/colourless fallback, and the canvas paints
// over it once the island hydrates.
//
// The band is revealed by scroll, not placed in view: it is the last thing on
// the page, and the art condenses in over the final band-height of scrolling
// (see `reveal()`). The plane's background is the art's own background, so the
// reserved box reads as plain page until the art arrives — that is what makes
// the reveal read as "hidden scroll" rather than an empty footer.
//
// Everything here is hand-rolled: no dependency, one rAF loop that only runs
// while something is actually moving.

const DECODE_MS = 1500;
const SETTLE_MS = 260; // pointer shimmer decay, ported from AsciiPortrait
const SHIMMER_SPAN = 0.12; // of the band width
// The reveal finishes before the page bottoms out, so the art is at rest for
// the last stretch instead of still settling when the scroll stops.
const REVEAL_AT = 0.85;
const FONT_STACK = "ui-monospace, SFMono-Regular, Menlo, monospace";

const CELLS = coastCols * coastRows;

// index char -> colour, resolved once. A char outside the palette would be a
// data bug, so it falls back to the background rather than throwing a bad
// fillStyle at draw time.
const colourOf = (() => {
  const table = new Map<string, string>();
  for (let i = 0; i < coastPalette.length; i++) {
    table.set(coastIndexAlphabet[i], coastPalette[i]);
  }
  return (ch: string) => table.get(ch) ?? coastBackground;
})();

// Flat grids: the draw loop indexes these per cell, so two arrays of chars beat
// two arrays of strings.
const glyphAt = (() => {
  const out = new Array<string>(CELLS);
  for (let y = 0; y < coastRows; y++) {
    const row = coastGlyphs[y] ?? "";
    for (let x = 0; x < coastCols; x++) out[y * coastCols + x] = row[x] ?? " ";
  }
  return out;
})();

const colourIndexAt = (() => {
  const out = new Array<string>(CELLS);
  for (let y = 0; y < coastRows; y++) {
    const row = coastColorIndices[y] ?? "";
    for (let x = 0; x < coastCols; x++) out[y * coastCols + x] = row[x] ?? "0";
  }
  return out;
})();

// "rgb(150 220 255)" -> the numbers a gradient stop needs.
function rgbTriplet(css: string): [number, number, number] {
  const nums = css.match(/\d+/g);
  if (!nums || nums.length < 3) return [255, 255, 255];
  return [Number(nums[0]), Number(nums[1]), Number(nums[2])];
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t);

export default function CoastCipher() {
  const boxRef = useRef<HTMLElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const art = artRef.current;
    const canvas = canvasRef.current;
    if (!box || !art || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return; // leaves the SSR <pre> in place, which is the fallback

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let cellW = 0;
    let cellH = 0;
    let fontPx = 0;
    let ready = false;
    let grad: CanvasGradient | null = null;

    // Per-cell decode threshold — column-biased then row-biased, so the crest
    // resolves left to right and top down rather than in a straight wipe.
    const threshold = new Float32Array(CELLS);
    for (let y = 0; y < coastRows; y++) {
      for (let x = 0; x < coastCols; x++) {
        threshold[y * coastCols + x] =
          (x / (coastCols - 1)) * 0.78 +
          (y / (coastRows - 1)) * 0.22 +
          Math.random() * 0.2;
      }
    }

    const noiseGlyph = () =>
      coastNoise[(Math.random() * coastNoise.length) | 0];

    // ---- geometry + one-time paint ----------------------------------------

    // Cell width comes from the box, not from the font: the art fills its
    // container exactly, and the glyph size is then derived from the measured
    // advance ratio so a monospace fallback font can't break the grid.
    function measure(): boolean {
      const w = art!.clientWidth;
      const h = art!.clientHeight;
      if (!w || !h) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;

      const ref = 100;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.font = `${ref}px ${FONT_STACK}`;
      const advance = ctx!.measureText("M").width / ref;

      cellW = w / coastCols;
      cellH = coastCellAspect * cellW;
      fontPx = advance > 0 ? cellW / advance : cellW;
      ctx!.font = `${fontPx}px ${FONT_STACK}`;
      ctx!.textAlign = "left";
      ctx!.textBaseline = "middle";

      // The bloom is a screen-blended radial gradient. It is applied as a
      // clipped fill rather than left baked in, because partial redraws (decode,
      // shimmer) clear their cells and would otherwise punch holes in the glow.
      const [r, g, b] = rgbTriplet(coastGlow.tint);
      grad = ctx!.createRadialGradient(
        coastGlow.cx * w,
        coastGlow.cy * h,
        0,
        coastGlow.cx * w,
        coastGlow.cy * h,
        coastGlow.radius * w,
      );
      const STOPS = 16;
      for (let i = 0; i <= STOPS; i++) {
        const t = i / STOPS;
        const alpha = coastGlow.strength * (1 - t) ** coastGlow.falloff;
        grad.addColorStop(t, `rgba(${r},${g},${b},${alpha.toFixed(4)})`);
      }
      return true;
    }

    function paintCell(i: number, glyph: string) {
      const x = i % coastCols;
      const y = (i / coastCols) | 0;
      const px = x * cellW;
      const py = y * cellH;
      // Opaque cell: fill the background, then the glyph. No clearRect — the
      // canvas is meant to be opaque so nothing behind it shows through.
      ctx!.fillStyle = coastBackground;
      ctx!.fillRect(px, py, cellW + 1, cellH + 1);
      ctx!.fillStyle = colourOf(colourIndexAt[i]);
      ctx!.fillText(glyph, px, py + cellH / 2);
    }

    function paintAll(glyphs: string[]) {
      ctx!.fillStyle = coastBackground;
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
      for (let i = 0; i < CELLS; i++) {
        const x = i % coastCols;
        const y = (i / coastCols) | 0;
        ctx!.fillStyle = colourOf(colourIndexAt[i]);
        ctx!.fillText(glyphs[i], x * cellW, y * cellH + cellH / 2);
      }
      paintBloom(0, 0, coastCols * cellW, coastRows * cellH);
    }

    function paintBloom(x: number, y: number, w: number, h: number) {
      if (!grad) return;
      ctx!.save();
      ctx!.beginPath();
      ctx!.rect(x, y, w, h);
      ctx!.clip();
      ctx!.globalCompositeOperation = "screen";
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, coastCols * cellW, coastRows * cellH);
      ctx!.globalCompositeOperation = "source-over";
      ctx!.restore();
    }

    // Bounding box of the cells a frame touched, so the bloom is re-applied to
    // exactly the region that lost it.
    function flush(changed: number[], glyphs: string[]) {
      for (const i of changed) paintCell(i, glyphs[i]);
      if (!changed.length) return;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const i of changed) {
        const x = (i % coastCols) * cellW;
        const y = ((i / coastCols) | 0) * cellH;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      paintBloom(minX, minY, maxX - minX + cellW + 1, maxY - minY + cellH + 1);
    }

    // ---- animation --------------------------------------------------------

    const live = new Array<string>(CELLS); // what is on the canvas right now
    let introDone = false;
    let raf = 0;

    const restingGlyphs = glyphAt;
    function restingFrame() {
      restingGlyphs.forEach((g, i) => (live[i] = g));
      if (!ready) return;
      paintAll(restingGlyphs);
    }

    function startDecode() {
      if (introDone) return;
      if (reduced) {
        introDone = true;
        restingFrame();
        return;
      }
      const started = performance.now();
      introDone = true;
      let last = 0;
      const changed: number[] = [];
      const frame = (ts: number) => {
        if (document.hidden) {
          raf = requestAnimationFrame(frame);
          return;
        }
        const p = easeOutCubic(clamp01((ts - started) / DECODE_MS));
        if (ts - last > 16) {
          last = ts;
          changed.length = 0;
          for (let i = 0; i < CELLS; i++) {
            const target = p >= threshold[i] ? glyphAt[i] : noiseGlyph();
            if (target !== live[i]) {
              live[i] = target;
              changed.push(i);
            }
          }
          flush(changed, live);
        }
        if (p < 1) raf = requestAnimationFrame(frame);
        else {
          restingFrame();
          shimmerGate = true;
        }
      };
      raf = requestAnimationFrame(frame);
    }

    // ---- pointer shimmer --------------------------------------------------

    let shimmerGate = false;
    const disturb = new Float32Array(CELLS);
    let shimmerRaf = 0;
    let shimmerLast = 0;
    let shimmering = false;

    function shimmerFrame(ts: number) {
      if (!shimmerLast) shimmerLast = ts;
      const step = (ts - shimmerLast) / SETTLE_MS;
      shimmerLast = ts;
      let any = false;
      const changed: number[] = [];
      for (let i = 0; i < CELLS; i++) {
        if (disturb[i] <= 0) continue;
        disturb[i] = Math.max(0, disturb[i] - step);
        const target =
          disturb[i] > 0.02 && Math.random() < disturb[i]
            ? noiseGlyph()
            : glyphAt[i];
        if (target !== live[i]) {
          live[i] = target;
          changed.push(i);
        }
        if (disturb[i] > 0) any = true;
      }
      flush(changed, live);
      if (any) shimmerRaf = requestAnimationFrame(shimmerFrame);
      else {
        shimmering = false;
        shimmerLast = 0;
        restingFrame();
      }
    }

    function onPointer(e: PointerEvent) {
      if (!ready || !shimmerGate || document.hidden) return;
      const rect = canvas!.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const radius = Math.max(26, rect.width * SHIMMER_SPAN);
      // Only the cells inside the radius' bounding box are considered — the
      // full 6834-cell sweep per pointermove is what AsciiPortrait does, and it
      // is avoidable at this grid size.
      const x0 = Math.max(0, Math.floor((mx - radius) / cellW));
      const x1 = Math.min(coastCols - 1, Math.ceil((mx + radius) / cellW));
      const y0 = Math.max(0, Math.floor((my - radius) / cellH));
      const y1 = Math.min(coastRows - 1, Math.ceil((my + radius) / cellH));
      if (x1 < x0 || y1 < y0) return;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = (x + 0.5) * cellW - mx;
          const dy = (y + 0.5) * cellH - my;
          const d = Math.hypot(dx, dy);
          if (d >= radius) continue;
          const i = y * coastCols + x;
          const v = 1 - d / radius;
          if (v > disturb[i]) disturb[i] = v;
        }
      }
      if (!shimmering) {
        shimmering = true;
        shimmerLast = 0;
        shimmerRaf = requestAnimationFrame(shimmerFrame);
      }
    }

    // ---- scroll reveal ----------------------------------------------------

    // Progress is purely geometric: 0 when the band's top edge reaches the
    // viewport bottom (i.e. exactly when the page's content ends) and 1 once the
    // band has scrolled fully in. Squared-off against REVEAL_AT so it settles
    // early rather than still moving when the scroll stops.
    function reveal() {
      if (!art) return;
      if (reduced) {
        art.style.transform = "";
        art.style.opacity = "";
        return;
      }
      const rect = box!.getBoundingClientRect();
      const travel = rect.height || 1;
      const p = easeOutCubic(
        clamp01((window.innerHeight - rect.top) / travel / REVEAL_AT),
      );
      art.style.transform = `translate3d(0, ${((1 - p) * 12).toFixed(2)}%, 0) scale(${(0.985 + 0.015 * p).toFixed(4)})`;
      art.style.opacity = p.toFixed(4);
    }

    let scrollRaf = 0;
    function onScroll() {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        reveal();
      });
    }

    function setup(): boolean {
      if (!measure()) return false;
      ready = true;
      restingFrame();
      // A short page (or a restored scroll position) can be showing the band
      // already; the observer below then fires immediately, which is the
      // intended "it is in view, decode now".
      reveal();
      return true;
    }

    let observer: IntersectionObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    if (setup()) {
      if (reduced) {
        introDone = true;
        shimmerGate = false;
      } else {
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                startDecode();
                observer?.disconnect();
                observer = null;
              }
            }
          },
          { threshold: 0.35 },
        );
        observer.observe(box);
      }

      resizeObserver = new ResizeObserver(() => {
        if (!measure()) return;
        paintAll(introDone && !shimmering ? restingGlyphs : live);
      });
      resizeObserver.observe(art);

      if (!reduced) {
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        window.addEventListener("pointermove", onPointer, { passive: true });
      }
    }

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(shimmerRaf);
      cancelAnimationFrame(scrollRaf);
      observer?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return (
    <footer
      ref={boxRef}
      className="coast-band"
      // Decorative, so the accessibility story is one image: the <pre> is
      // aria-hidden and the wrapper carries the description.
      role="img"
      aria-label={coastAlt}
    >
      <div className="coast-band__container">
        <div ref={artRef} className="coast-band__art">
          <pre aria-hidden="true" className="coast-band__pre">
            {coastGlyphs.join("\n")}
          </pre>
          <canvas
            ref={canvasRef}
            className="coast-band__canvas"
            aria-hidden="true"
          />
        </div>
      </div>
    </footer>
  );
}
