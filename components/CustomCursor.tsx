"use client";

import { useEffect } from "react";

// Fine-pointer custom cursor: a lagging ring + a dot pinned under the pointer +
// a labelled pill for view/drag targets, driven by `data-cursor` attributes and
// by defaulting links/buttons to `link` and images to `view`.
//
// Armed only where it makes sense: a fine pointer, no reduced motion, and not
// the admin surface. The native cursor stays visible until the first
// `pointermove` proves we can draw our own — so a keyboard-only user, a failed
// init, or a touch device never ends up cursor-less. Ported from the
// oss/website kinetic cursor (kinetic.ts `cursor()`), retinted to the indigo
// accent.
const TEXT_FIELDS =
  "input, textarea, select, [contenteditable]:not([contenteditable='false'])";
const ACTIONABLE = "a[href], button, [role='button'], summary, label";
const DEFAULT_LABELS: Record<string, string> = { view: "View", drag: "Drag" };

type Resolution = { state: string; label?: string };

// Explicit `data-cursor` wins; then, if nothing opts out, an image reads as
// "view" and a link/button as "link". Text fields suppress the whole cursor.
function resolveAt(target: Element | null): Resolution {
  if (!target) return { state: "idle" };
  if (target.closest(TEXT_FIELDS)) return { state: "hide" };
  const explicit = target.closest<HTMLElement>("[data-cursor]");
  if (explicit) {
    return {
      state: explicit.dataset.cursor || "link",
      label: explicit.dataset.cursorLabel,
    };
  }
  if (target.closest("img")) return { state: "view" };
  if (target.closest(ACTIONABLE)) return { state: "link" };
  return { state: "idle" };
}

export default function CustomCursor() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // The admin console keeps its native cursor — it is a dense form surface.
    if (window.location.pathname.startsWith("/admin")) return;
    if (!document.body) return;

    const make = (tag: string, cls: string) => {
      const node = document.createElement(tag);
      node.className = cls;
      return node;
    };

    const root = make("div", "cursor");
    root.dataset.state = "off";
    root.setAttribute("aria-hidden", "true");
    const ring = make("div", "cursor__ring");
    const dot = make("div", "cursor__dot");
    const pill = make("div", "cursor__pill");
    const pillText = make("span", "cursor__pill-text");
    const arrow = make("span", "arw");
    arrow.textContent = "→";
    pill.append(pillText, arrow);
    root.append(ring, dot, pill);

    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;
    let down = false;
    let primed = false;
    let raf = 0;

    // Only runs while the ring is catching up to the pointer, so a settled page
    // costs nothing.
    const loop = () => {
      const slow =
        root.dataset.state === "view" || root.dataset.state === "drag";
      const ease = slow ? 0.13 : 0.18;
      rx += (mx - rx) * ease;
      ry += (my - ry) * ease;
      root.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      dot.style.transform = `translate3d(${mx - rx}px, ${my - ry}px, 0) scale(${down ? 0.6 : 1})`;
      if (Math.abs(mx - rx) < 0.1 && Math.abs(my - ry) < 0.1) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const apply = (r: Resolution) => {
      root.dataset.state = r.state;
      pillText.textContent = r.label ?? DEFAULT_LABELS[r.state] ?? "";
    };

    const onOver = (e: PointerEvent) => apply(resolveAt(e.target as Element));
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!primed) {
        // Snap on the first frame so the ring doesn't swoosh in from the
        // origin, and only now hide the native cursor.
        primed = true;
        rx = mx;
        ry = my;
        root.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
        document.documentElement.classList.add("has-cursor");
        if (root.dataset.state === "off") root.dataset.state = "idle";
      }
      kick();
    };
    const onDown = () => {
      down = true;
      kick();
    };
    const onUp = () => {
      down = false;
      kick();
    };
    const onLeave = () => {
      root.dataset.state = "off";
    };
    const onEnter = () => {
      if (root.dataset.state === "off") root.dataset.state = "idle";
    };

    try {
      document.body.appendChild(root);
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("pointerup", onUp, { passive: true });
      window.addEventListener("pointerenter", onEnter);
      document.addEventListener("pointerover", onOver);
      document.addEventListener("pointerleave", onLeave);
    } catch {
      // If anything failed, make sure the native cursor is the one on screen.
      document.documentElement.classList.remove("has-cursor");
      root.remove();
      return;
    }

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointerenter", onEnter);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerleave", onLeave);
      root.remove();
    };
  }, []);

  return null;
}
