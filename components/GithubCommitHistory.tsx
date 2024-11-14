"use client";

import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export default function GithubCommitHistory() {
  const { theme } = useTheme();

  return (
    <picture className="mb-8 mt-24">
      {theme == "dark" ? (
        <source srcSet="https://ssr-contributions-svg.vercel.app/_/furkanunsalan?format=svg&amp;weeks=30&amp;dark=true" />
      ) : (
        <source srcSet="https://ssr-contributions-svg.vercel.app/_/furkanunsalan?format=svg&amp;weeks=30" />
      )}

      <motion.img
        alt=""
        src="https://ssr-contributions-svg.vercel.app/_/furkanunsalan?format=svg&amp;weeks=30"
        max-height="30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
    </picture>
  );
}
