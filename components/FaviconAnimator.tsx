"use client";

import { useEffect } from "react";

// A decrypt-style animated favicon: rapidly cycles random white glyphs, then
// locks onto a styled geometric "F", holds for about a second, and loops. Echoes
// the wordmark's scramble-on-hover. Drawn to a canvas and pushed to the
// <link rel="icon"> each frame.

const GLYPHS =
  "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/\\|=+*<>{}[]~▚▞▙▟█▓▒░".split("");

const WHITE = "#ffffff";
const BG = "#0a0a0a";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function FaviconAnimator() {
  useEffect(() => {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Collect existing icon links; keep hrefs to restore on unmount. Update all
    // of them each frame so whichever the browser uses shows the animation.
    let links = Array.from(
      document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']"),
    );
    const originals = links.map((el) => ({
      el,
      href: el.getAttribute("href"),
    }));
    if (links.length === 0) {
      const el = document.createElement("link");
      el.rel = "icon";
      el.type = "image/png";
      document.head.appendChild(el);
      links = [el];
    }

    const tile = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = BG;
      roundRect(ctx, 0.5, 0.5, size - 1, size - 1, 7);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      roundRect(ctx, 0.5, 0.5, size - 1, size - 1, 7);
      ctx.stroke();
    };

    const flush = () => {
      const url = canvas.toDataURL("image/png");
      for (const l of links) l.setAttribute("href", url);
    };

    const paintGlyph = (ch: string) => {
      tile();
      ctx.fillStyle = WHITE;
      ctx.font =
        "bold 21px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ch, size / 2, size / 2 + 1.5);
      flush();
    };

    // A hand-built geometric F: stem + top arm + shorter middle arm.
    const paintF = () => {
      tile();
      ctx.fillStyle = WHITE;
      const bar = (x: number, y: number, w: number, h: number) => {
        roundRect(ctx, x, y, w, h, 1.6);
        ctx.fill();
      };
      bar(10, 8, 4, 16); // stem
      bar(10, 8, 12, 4); // top arm
      bar(10, 13.8, 9, 3.6); // middle arm
      flush();
    };

    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    if (reduce) {
      paintF();
      return () => {
        for (const { el, href } of originals)
          if (href) el.setAttribute("href", href);
      };
    }

    // Fast, longer scramble (~0.65s of quick glyph swaps), lock to F,
    // hold ~1s, then loop forever.
    const STEP = 30;
    const SCRAMBLE = 22;
    const CYCLE = 56;
    let tick = 0;
    const id = window.setInterval(() => {
      const t = tick % CYCLE;
      if (t < SCRAMBLE) {
        paintGlyph(GLYPHS[(Math.random() * GLYPHS.length) | 0]);
      } else if (t === SCRAMBLE) {
        paintF();
      }
      // hold phase: skip redraw (avoids needless toDataURL work)
      tick++;
    }, STEP);

    return () => {
      window.clearInterval(id);
      for (const { el, href } of originals)
        if (href) el.setAttribute("href", href);
    };
  }, []);

  return null;
}
