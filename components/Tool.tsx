import type { Tool as ToolType } from "@/types";
import { FaShoppingCart, FaHeart } from "react-icons/fa";
import Link from "next/link"; // If you are using Next.js for routing

export default function Tool({ tool }: { tool: ToolType }) {
  const { name, comment, brand, favorite, what, link } = tool;

  return (
    <article className="flex justify-between items-start border-b border-b-zinc-200 py-4 sm:py-8 dark:border-b-zinc-800">
      <div className="flex-1">
        <header>
          <h6 className="flex flex-row font-mono text-sm uppercase tracking-wider opacity-50 dark:opacity-40">
            {what.toUpperCase()}
            {favorite && <FaHeart className="ml-2 my-auto"/>}
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition"
          >
            <FaShoppingCart size={16} />
          </Link>
        </footer>
      )}
    </article>
  );
}