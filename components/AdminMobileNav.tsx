"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import AdminNav from "./AdminNav";

export default function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-md border border-white/10 bg-white/[0.03] text-light-secondary hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-colors"
      >
        <Menu className="w-4 h-4" />
      </button>

      {mounted &&
        createPortal(
          <div
            className={`md:hidden fixed inset-0 z-50 transition-opacity ${
              open
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={!open}
          >
            <button
              type="button"
              aria-label="Close menu"
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <aside
              className={`absolute inset-y-0 left-0 w-[78%] max-w-xs bg-black border-r border-white/[0.06] shadow-2xl transition-transform duration-200 ${
                open ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="h-12 px-4 flex items-center justify-between border-b border-white/[0.06]">
                <span className="text-sm font-semibold tracking-tight">
                  furkanunsalan.dev
                </span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-light-secondary hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-3 py-3 overflow-y-auto max-h-[calc(100vh-3rem)]">
                <AdminNav onNavigate={() => setOpen(false)} />
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
