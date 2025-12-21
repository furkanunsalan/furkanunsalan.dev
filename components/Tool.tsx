import type { Tool as ToolType } from "@/types";
import { FaHeart } from "react-icons/fa";
import { ChevronRight, ArrowRight } from "lucide-react";
import Link from "next/link"; // If you are using Next.js for routing
import { motion } from "framer-motion"; // Import Framer Motion

export default function Tool({ tool }: { tool: ToolType }) {
  const { name, comment, brand, favorite, what, link } = tool;

  const content = (
    <motion.article
      className={`group flex justify-between items-start border-b border-b-light-secondary py-4 sm:py-8 dark:border-b-zinc-800 ${
        link
          ? "cursor-pointer hover:opacity-80 transition-opacity duration-300"
          : ""
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeIn" }}
    >
      <div className="flex-1">
        <header>
          <h6 className="flex flex-row font-mono text-sm uppercase tracking-wider opacity-50 dark:opacity-40">
            {what.toUpperCase()}
            {favorite && <FaHeart className="ml-2 my-auto" />}
          </h6>
          <h3 className="mt-1 font-semibold">
            <span className="">{brand}</span> <span className="">{name}</span>
          </h3>
        </header>

        <p className="mt-1 opacity-70 dark:opacity-60">{comment}</p>
      </div>

      {link && (
        <footer className="flex-shrink-0 flex items-center ml-4 my-auto">
          <div className="relative inline-flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-white dark:text-white group-hover:opacity-0 group-hover:scale-0 transition-all duration-300" />
            <ArrowRight className="w-4 h-4 text-accent-primary absolute opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300" />
          </div>
        </footer>
      )}
    </motion.article>
  );

  if (link) {
    return (
      <Link href={link} target="_blank" data-umami-event={name + " -> Web"}>
        {content}
      </Link>
    );
  }

  return content;
}
