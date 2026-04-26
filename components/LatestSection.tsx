import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type LatestItem = {
  type: "experience" | "writing" | "project" | "bookmark" | "photo";
  title: string;
  href: string;
  date?: string;
  external?: boolean;
};

const TYPE_LABEL: Record<LatestItem["type"], string> = {
  experience: "EXP",
  writing: "POST",
  project: "REPO",
  bookmark: "SAVE",
  photo: "SHOT",
};

function isoDate(date?: string) {
  if (!date) return "----------";
  const d = new Date(date);
  if (isNaN(d.getTime())) return date.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export default function LatestSection({ items }: { items: LatestItem[] }) {
  if (!items.length) return null;

  return (
    <section className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 mb-12 animate-fade-in-up delay-300">
      <h2 className="font-mono text-xs uppercase tracking-widest text-light-fourth mb-3">
        Latest
      </h2>
      <ul className="border-t border-white/[0.06] stagger">
        {items.map((item) => {
          const label = TYPE_LABEL[item.type];
          const inner = (
            <div className="group grid grid-cols-[auto_auto_auto_1fr_auto] items-center gap-x-2 py-2.5 border-b border-white/[0.06]">
              <span className="font-mono text-xs text-light-fourth tabular-nums">
                [{isoDate(item.date)}]
              </span>
              <span className="font-mono text-[10px] tracking-widest text-accent-primary/80 inline-block min-w-[2.75rem]">
                {label}
              </span>
              <span className="text-light-fourth select-none">·</span>
              <span className="text-sm text-white group-hover:text-accent-primary transition-colors truncate">
                {item.title}
              </span>
              <ChevronRight className="hidden sm:block w-3.5 h-3.5 text-accent-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
            </div>
          );
          return (
            <li key={`${item.type}-${item.href}`}>
              {item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-umami-event={`Latest ${label}`}
                >
                  {inner}
                </a>
              ) : (
                <Link href={item.href} data-umami-event={`Latest ${label}`}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
