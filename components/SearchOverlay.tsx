"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SearchResults from "@/components/SearchResults";
import { markSearchReady, onOpenSearch } from "@/lib/search-open";

// Keep in step with .animate-fade-out / .animate-scale-out in globals.css: the
// overlay stays mounted from the close until the exit animation has played.
const EXIT_MS = 180;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return (el as HTMLElement).isContentEditable === true;
}

export default function SearchOverlay() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [seed, setSeed] = useState("");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  // Where focus was before opening, so close can hand it back to the trigger.
  const restoreRef = useRef<HTMLElement | null>(null);
  // Mirrors `open`/`closing` so openWith/close can stay stable callbacks.
  const openRef = useRef(false);
  const closingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  // Tell triggers in other islands (the nav magnifier) that a listener exists,
  // so they open the modal instead of navigating to /search.
  useEffect(() => markSearchReady(), []);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // createPortal needs a DOM node, hence `mounted`; opening is decoupled from
  // the trigger so a deep link, a nav click and ⌘K all land here.
  const openWith = useCallback((q: string) => {
    clearTimer();
    // Only remember the trigger when the overlay wasn't already up, so a
    // re-open mid-close still restores the real element.
    if (!openRef.current) {
      restoreRef.current = document.activeElement as HTMLElement | null;
    }
    setSeed(q);
    closingRef.current = false;
    openRef.current = true;
    setClosing(false);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    if (!openRef.current || closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      closingRef.current = false;
      openRef.current = false;
      setOpen(false);
      setClosing(false);
      restoreRef.current?.focus?.();
    }, EXIT_MS);
  }, []);

  // Triggers in other islands (the nav magnifier) ask the overlay to open.
  useEffect(() => onOpenSearch(openWith), [openWith]);

  // /search?q=… is a deep link, not a page: land on it and the modal is already
  // open with the query. The server-rendered results stay behind it as the
  // no-JS fallback.
  useEffect(() => {
    if (window.location.pathname === "/search") {
      openWith(new URLSearchParams(window.location.search).get("q") || "");
    }
  }, [openWith]);

  // ⌘K toggles, `/` opens from anywhere outside a text field, Esc closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        openRef.current ? close() : openWith("");
        return;
      }
      if (e.key === "Escape" && openRef.current) {
        e.preventDefault();
        close();
        return;
      }
      if (
        e.key === "/" &&
        !openRef.current &&
        !isEditable(document.activeElement)
      ) {
        e.preventDefault();
        openWith("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, openWith]);

  // Scroll lock copied from the lightboxes; the overlay is fixed, so nothing
  // behind it shifts once the scrollbar is out of the flow.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>("input")?.focus();
    }, 0);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => clearTimer, []);

  // Trap Tab inside the dialog and wrap at both ends.
  function onDialogKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusables = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    );
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    const inside = dialogRef.current.contains(active);
    if (e.shiftKey && (!inside || active === first)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !inside)) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm ${
        closing ? "animate-fade-out pointer-events-none" : "animate-fade-in"
      }`}
      style={{ animationDuration: `${EXIT_MS}ms` }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onKeyDown={onDialogKeyDown}
        className={`mt-[12vh] w-[92%] max-w-2xl overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-white/10 shadow-2xl ${
          closing ? "animate-scale-out" : "animate-scale-in"
        }`}
        style={{ animationDuration: `${EXIT_MS}ms` }}
      >
        <SearchResults variant="modal" initialQuery={seed} onActivate={close} />
      </div>
    </div>,
    document.body,
  );
}
