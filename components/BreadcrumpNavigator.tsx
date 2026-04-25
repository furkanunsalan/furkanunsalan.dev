"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Briefcase,
  FolderGit2,
  Camera,
  Bookmark,
  PenLine,
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
  {
    name: "Bookmarks",
    href: "/bookmarks",
    icon: <Bookmark className={ICON_CLASS} />,
  },
  {
    name: "Writing",
    href: "/writing",
    icon: <PenLine className={ICON_CLASS} />,
  },
];

export default function BreadcrumbNavigator() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return (
    <div className="fixed top-0 left-0 right-0 z-10 p-4 flex justify-center bg-dark-primary">
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
                    className={`relative inline-flex items-center px-1 py-0.5 transition-colors duration-300 ease-in-out ${
                      isActive
                        ? "text-accent-primary"
                        : "text-light-secondary hover:text-white"
                    }`}
                    data-umami-event={route.href}
                  >
                    {route.icon}
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
