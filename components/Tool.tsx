import type { Tool as ToolType } from "@/types";
import { Heart, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function Tool({ tool }: { tool: ToolType }) {
  const { name, comment, brand, favorite, what, link } = tool;

  const content = (
    <article
      className={`group flex items-center gap-3 py-2 border-b border-white/[0.06] last:border-b-0 ${
        link ? "cursor-pointer" : ""
      }`}
    >
      {favorite && (
        <Heart className="w-3 h-3 text-accent-primary fill-accent-primary flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className="text-sm font-medium text-white group-hover:text-accent-primary transition-colors duration-200 whitespace-nowrap">
          {brand} {name}
        </span>
        <span className="text-xs font-mono uppercase tracking-wider text-light-fourth flex-shrink-0">
          {what}
        </span>
        {comment && (
          <span className="text-xs text-light-secondary/60 truncate">
            — {comment}
          </span>
        )}
      </div>
      {link && (
        <ArrowUpRight className="w-3.5 h-3.5 text-light-fourth group-hover:text-accent-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 flex-shrink-0" />
      )}
    </article>
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
