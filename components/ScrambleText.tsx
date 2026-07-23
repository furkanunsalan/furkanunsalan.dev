"use client";

import { useRef } from "react";

const CHARS = "!<>-_\\/[]{}=+*^?#________01";

// Text that "decrypts" on hover — each character resolves left-to-right while
// the rest flicker through random glyphs. Cheap: mutates textContent via a ref.
export default function ScrambleText({
  text,
  className = "",
  duration = 500,
}: {
  text: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const raf = useRef<number>();
  const startRef = useRef<number>();

  const run = () => {
    const el = ref.current;
    if (!el) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    startRef.current = undefined;

    const frame = (now: number) => {
      if (startRef.current === undefined) startRef.current = now;
      const p = Math.min(1, (now - startRef.current) / duration);
      const reveal = p * text.length;
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === " ") out += " ";
        else if (i < reveal - 0.5) out += c;
        else out += CHARS[(Math.random() * CHARS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) raf.current = requestAnimationFrame(frame);
      else el.textContent = text;
    };
    raf.current = requestAnimationFrame(frame);
  };

  return (
    <span ref={ref} onMouseEnter={run} className={className}>
      {text}
    </span>
  );
}
