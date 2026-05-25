"use client";

import { useEffect } from "react";

// Restores window scroll on mount, and snapshots it before any internal-link
// navigation. Drop into a list page so returning from an edit/new screen lands
// the user where they left off.
//
// Storage key is page-scoped (e.g. "admin:places:scroll"), so different
// collections don't trample each other.
export default function RestoreScroll({ storageKey }: { storageKey: string }) {
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const y = parseInt(raw, 10);
        if (!Number.isNaN(y)) {
          // Defer one frame so the just-mounted list has its DOM laid out.
          requestAnimationFrame(() => window.scrollTo(0, y));
        }
        sessionStorage.removeItem(storageKey);
      }
    } catch {}

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      if (a.getAttribute("target")) return;
      try {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      } catch {}
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [storageKey]);

  return null;
}
