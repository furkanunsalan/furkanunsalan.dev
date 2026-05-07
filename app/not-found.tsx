"use client";

import MainNavbar from "@/components/MainNavbar";

const routes = [
  "/",
  "/experience",
  "/projects",
  "/photos",
  "/bookmarks",
  "/writing",
];

export default function NotFound() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="flex flex-col items-center stagger">
        <div
          className="glitch text-6xl sm:text-7xl font-thin tracking-[0.2em] select-none"
          data-text="404"
          aria-label="404"
        >
          <span aria-hidden className="glitch-green" data-text="404" />
          404
        </div>
        <div className="text-l mt-6 text-light-secondary/80">
          This is not the page you are looking for
        </div>
        <MainNavbar routes={routes} />
      </div>
    </div>
  );
}
