"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Briefcase,
  FolderGit2,
  Camera,
  Bookmark,
  PenLine,
  MapPin,
} from "lucide-react";

const ICON_CLASS = "w-5 h-5";

const routes: { name: string; href: string; icon: React.ReactNode }[] = [
  { name: "Home", href: "/", icon: <Home className={ICON_CLASS} /> },
  {
    name: "Experience",
    href: "/experience",
    icon: <Briefcase className={ICON_CLASS} />,
  },
  {
    name: "Projects",
    href: "/projects",
    icon: <FolderGit2 className={ICON_CLASS} />,
  },
  { name: "Photos", href: "/photos", icon: <Camera className={ICON_CLASS} /> },
  { name: "Places", href: "/places", icon: <MapPin className={ICON_CLASS} /> },
  {
    name: "Bookmarks",
    href: "/bookmarks",
    icon: <Bookmark className={ICON_CLASS} />,
  },
  {
    name: "Thoughts",
    href: "/writing",
    icon: <PenLine className={ICON_CLASS} />,
  },
];

export default function BreadcrumbNavigator() {
  const pathname = usePathname();
  const router = useRouter();
  const [modifierHeld, setModifierHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) setModifierHeld(true);

      if (!(e.metaKey || e.ctrlKey)) return;
      const idx = parseInt(e.key, 10);
      if (Number.isNaN(idx) || idx < 1 || idx > routes.length) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      router.push(routes[idx - 1].href);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      // Either modifier release clears the badges; both also clear on blur.
      if (!e.metaKey && !e.ctrlKey) setModifierHeld(false);
    };
    const onBlur = () => setModifierHeld(false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [router]);

  return (
    <div className="fixed top-0 left-0 right-0 z-10 p-4 flex justify-center bg-dark-primary animate-fade-in-down after:content-[''] after:pointer-events-none after:absolute after:left-0 after:right-0 after:top-full after:h-8 after:bg-gradient-to-b after:from-dark-primary after:to-transparent">
      <nav>
        <ul className="flex flex-row flex-wrap items-center justify-center gap-x-2 text-base md:text-lg">
          {routes.map((route, index) => {
            const isActive =
              route.href === "/"
                ? pathname === "/"
                : pathname === route.href ||
                  pathname?.startsWith(route.href + "/");
            return (
              <React.Fragment key={route.href}>
                {index > 0 && (
                  <span
                    aria-hidden
                    className="text-light-fourth/60 select-none font-thin text-sm"
                  >
                    /
                  </span>
                )}
                <li>
                  <Link
                    href={route.href}
                    aria-label={route.name}
                    title={route.name}
                    className={`relative inline-flex items-center px-1 py-0.5 transition-all duration-300 ease-in-out hover:-translate-y-0.5 ${
                      isActive
                        ? "text-accent-primary"
                        : "text-light-secondary hover:text-white"
                    }`}
                    data-umami-event={route.href}
                  >
                    {route.icon}
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute -bottom-1.5 -right-1.5 inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-[3px] font-mono text-[9px] leading-none tabular-nums bg-zinc-950 border border-accent-primary/40 text-accent-primary transition-all duration-150 ${
                        modifierHeld
                          ? "opacity-100 translate-y-0 scale-100"
                          : "opacity-0 translate-y-0.5 scale-95"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </Link>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
