"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const NAME = "Furkan Ünsalan";
const SHORT = "FÜ";

const WORK = [
  { label: "Experience", href: "/experience" },
  { label: "Projects", href: "/projects" },
];
const HOBBY = [
  { label: "Places", href: "/places" },
  { label: "Photos", href: "/photos" },
  { label: "Bookmarks", href: "/bookmarks" },
];

const topCls = (active: boolean) =>
  `inline-flex items-center gap-1 text-sm transition-colors duration-200 ${
    active ? "text-accent-primary" : "text-light-secondary hover:text-white"
  }`;

export default function SiteNav() {
  const pathname = usePathname();
  const [menu, setMenu] = useState<null | "work" | "hobby">(null);

  // Close any open dropdown after navigating (the layout persists across routes).
  useEffect(() => setMenu(null), [pathname]);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || (pathname?.startsWith(href + "/") ?? false);
  const groupActive = (items: { href: string }[]) =>
    items.some((i) => isActive(i.href));

  return (
    <>
      {/* Solid black + fixed: no translucent gray seam, and it stays pinned on
          overscroll instead of floating down over the background. */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/[0.06] bg-dark-primary animate-fade-in-down">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="shrink-0 text-sm font-semibold text-white"
            data-umami-event="nav home"
          >
            <span className="md:hidden">{SHORT}</span>
            <span className="hidden md:inline">{NAME}</span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-5">
            <NavDropdown
              label="Work"
              items={WORK}
              align="left"
              active={groupActive(WORK)}
              open={menu === "work"}
              isActive={isActive}
              onToggle={() => setMenu((m) => (m === "work" ? null : "work"))}
              onClose={() => setMenu(null)}
            />
            <Link
              href="/writing"
              className={topCls(isActive("/writing"))}
              data-umami-event="nav writing"
            >
              Writing
            </Link>
            <NavDropdown
              label="Hobby"
              items={HOBBY}
              align="right"
              active={groupActive(HOBBY)}
              open={menu === "hobby"}
              isActive={isActive}
              onToggle={() => setMenu((m) => (m === "hobby" ? null : "hobby"))}
              onClose={() => setMenu(null)}
            />
          </nav>
        </div>
      </header>
      {menu && (
        <button
          aria-hidden
          tabIndex={-1}
          onClick={() => setMenu(null)}
          className="fixed inset-0 z-30 cursor-default"
        />
      )}
    </>
  );
}

function NavDropdown({
  label,
  items,
  align,
  active,
  open,
  isActive,
  onToggle,
  onClose,
}: {
  label: string;
  items: { label: string; href: string }[];
  align: "left" | "right";
  active: boolean;
  open: boolean;
  isActive: (href: string) => boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={topCls(active)}
      >
        {label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className={`absolute top-full z-50 mt-3 w-44 overflow-hidden rounded-lg border border-white/[0.08] bg-zinc-950 p-1 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={onClose}
              data-umami-event={`nav ${l.label.toLowerCase()}`}
              className={`block rounded-md px-3 py-2 text-sm ${
                isActive(l.href)
                  ? "text-accent-primary"
                  : "text-light-secondary hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
