"use client";

import { useTheme } from "next-themes";

export default function GithubCommitHistory() {
  const { theme } = useTheme();

  return (
    <picture>
      {theme == "dark" ? (
        <source srcSet="https://ssr-contributions-svg.vercel.app/_/furkanunsalan?format=svg&amp;weeks=30&amp;dark=true" />
      ) : (
        <source srcSet="https://ssr-contributions-svg.vercel.app/_/furkanunsalan?format=svg&amp;weeks=30" />
      )}

      <img
        alt=""
        src="https://ssr-contributions-svg.vercel.app/_/furkanunsalan?format=svg&amp;weeks=30"
        max-height="30"
      />
    </picture>
  );
}
