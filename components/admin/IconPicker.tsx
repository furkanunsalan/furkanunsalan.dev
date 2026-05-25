"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { ICON_KEYS, iconKey, type ListIconKey } from "@/lib/place-list-icons";
import { PLACE_LIST_ICON_COMPONENTS } from "@/lib/place-list-icons-react";

const POPOVER_W = 288; // matches w-72

export default function IconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (k: ListIconKey) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const current = iconKey(value);
  const Current = PLACE_LIST_ICON_COMPONENTS[current];

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const t = triggerRef.current;
      if (!t) return;
      const r = t.getBoundingClientRect();
      const vw = window.innerWidth;
      // Right-align to trigger, clamp within viewport.
      let left = r.right - POPOVER_W;
      if (left < 8) left = 8;
      if (left + POPOVER_W > vw - 8) left = vw - 8 - POPOVER_W;
      setPos({ top: r.bottom + 4, left });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t) || triggerRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q ? ICON_KEYS.filter((k) => k.includes(q)) : ICON_KEYS;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-md px-2.5 py-1.5 text-xs text-white hover:ring-white/20 disabled:opacity-50 min-w-[140px]"
      >
        <Current className="w-4 h-4" />
        <span className="flex-1 text-left truncate">{current}</span>
        <ChevronDown className="w-3.5 h-3.5 text-light-fourth" />
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ top: pos.top, left: pos.left, width: POPOVER_W }}
            className="fixed z-50 rounded-lg ring-1 ring-white/10 bg-zinc-950 shadow-2xl p-2"
          >
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-light-fourth" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search icons…"
                className="w-full bg-black ring-1 ring-white/[0.08] focus:ring-white/20 outline-none rounded-md pl-7 pr-2 py-1.5 text-xs text-white placeholder:text-light-fourth"
              />
            </div>
            <div
              className="grid grid-cols-6 gap-1 max-h-64 overflow-y-auto overflow-x-hidden"
              style={{ scrollbarWidth: "none" }}
            >
              {filtered.map((k) => {
                const I = PLACE_LIST_ICON_COMPONENTS[k];
                const active = k === current;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      onChange(k);
                      setOpen(false);
                    }}
                    title={k}
                    className={`inline-flex items-center justify-center aspect-square min-w-0 rounded-md ring-1 transition-colors ${
                      active
                        ? "bg-accent-primary/15 text-accent-primary ring-accent-primary/40"
                        : "ring-white/[0.06] text-light-secondary hover:text-white hover:ring-white/20"
                    }`}
                  >
                    <I className="w-4 h-4" />
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-6 py-4 text-xs text-light-fourth text-center">
                  No matches.
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
