"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

const MainNavbar: React.FC<{ routes: string[] }> = ({ routes }) => {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const idx = parseInt(e.key, 10);
      if (Number.isNaN(idx) || idx < 1 || idx > routes.length) return;
      e.preventDefault();
      router.push(routes[idx - 1]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [routes, router]);

  return (
    <nav className="mt-8 w-full max-w-4xl animate-fade-in delay-100">
      <ul className="flex flex-row flex-wrap items-center justify-center gap-x-2 gap-y-1 text-lg">
        {routes.map((route, index) => {
          const raw = route === "/" ? "home" : route.substring(1);
          const label = raw.charAt(0).toUpperCase() + raw.slice(1);
          return (
            <React.Fragment key={route}>
              {index > 0 && (
                <span aria-hidden className="text-light-fourth select-none">
                  /
                </span>
              )}
              <li>
                <Link
                  href={route}
                  className="relative inline-block px-1 py-0.5 transition-colors duration-300 ease-in-out group"
                  id="na-buttons"
                  data-umami-event={route}
                >
                  {label}
                  <span className="block absolute left-0 bottom-0 w-0 h-0.5 bg-white transition-all duration-300 ease-out group-hover:w-full"></span>
                </Link>
              </li>
            </React.Fragment>
          );
        })}
      </ul>
    </nav>
  );
};

export default MainNavbar;
