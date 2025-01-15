import type { Tool as ToolType } from "@/types";
import { FaShoppingCart, FaHeart } from "react-icons/fa";
import Link from "next/link"; // If you are using Next.js for routing
import { motion } from "framer-motion"; // Import Framer Motion

export default function Tool({ tool }: { tool: ToolType }) {
  const { name, comment, brand, favorite, what, link } = tool;

  return (
    <motion.article
      className="flex justify-between items-start border-b border-b-light-secondary py-4 sm:py-8 dark:border-b-zinc-800"
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
          <Link
            href={link}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-light-secondary dark:bg-dark-third rounded-lg hover:bg-light-third hover:dark:bg-dark-secondary transition"
            data-umami-event={name + " -> Web"}
          >
            <FaShoppingCart size={16} />
          </Link>
        </footer>
      )}
    </motion.article>
  );
}
