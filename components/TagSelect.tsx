"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Tag as TagIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Rect = { left: number; top: number; width: number };

export default function TagSelect({
  tags,
  value,
  onChange,
  placeholder = "All Tags",
}: {
  tags: string[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const items: (string | null)[] = [null, ...tags]; // null = "All"

  // Measure trigger so the portaled panel can sit flush below it. Re-measure
  // on resize/scroll so the panel doesn't detach from the trigger.
  const measure = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ left: r.left, top: r.bottom + 8, width: r.width });
  };
  useLayoutEffect(() => {
    if (!open) return;
    measure();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onWin = () => measure();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      const current = items.indexOf(value || null);
      setActiveIndex(current >= 0 ? current : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commit = (idx: number) => {
    const v = items[idx];
    onChange(v || "");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(items.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(activeIndex);
    }
  };

  const label = value || placeholder;

  return (
    <div className="relative w-full sm:w-1/3">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cn(
          "card w-full px-3 py-2 text-sm flex items-center justify-between gap-2 cursor-pointer transition-all duration-200",
          "hover:border-accent-primary/40",
          open && "border-accent-primary/60",
        )}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <TagIcon className="h-3.5 w-3.5 text-light-fourth flex-shrink-0" />
          <span
            className={cn(
              "truncate",
              value ? "text-light-secondary" : "text-light-fourth",
            )}
          >
            {label}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-light-fourth flex-shrink-0 transition-transform duration-200",
            open && "rotate-180 text-accent-primary",
          )}
        />
      </button>

      {open &&
        anchor &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={panelRef}
            role="listbox"
            tabIndex={-1}
            className="fixed z-[100] max-h-72 overflow-auto card p-1 shadow-[0_8px_28px_-12px_rgba(99,102,241,0.45)] animate-fade-in-down"
            style={{
              left: anchor.left,
              top: anchor.top,
              width: anchor.width,
              animationDuration: "180ms",
            }}
          >
            {items.map((tag, idx) => {
              const isSelected = (tag || "") === value;
              const isActive = idx === activeIndex;
              return (
                <li key={tag ?? "__all"}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => commit(idx)}
                    className={cn(
                      "w-full text-left text-sm rounded-md px-2.5 py-1.5 flex items-center justify-between gap-2 transition-colors duration-150",
                      isActive
                        ? "bg-zinc-900 text-white"
                        : "text-light-secondary hover:bg-zinc-900/60",
                    )}
                  >
                    <span className="truncate">{tag ?? placeholder}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-accent-primary flex-shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
