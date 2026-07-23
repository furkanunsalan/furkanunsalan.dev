"use client";

import { Link } from "@/components/_compat";
import { useMemo, useState } from "react";
import { Wrench, Star } from "lucide-react";
import { slugifyAscii } from "@/lib/slugify";

type Row = {
  name: string;
  brand: string;
  what: string;
  category: "tech" | "desk" | "other";
  favorite: boolean;
};

const CATS: { id: "all" | Row["category"]; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tech", label: "Tech" },
  { id: "desk", label: "Desk" },
  { id: "other", label: "Other" },
];

export default function ToolsAdminTabs({ rows }: { rows: Row[] }) {
  const [active, setActive] = useState<(typeof CATS)[number]["id"]>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.category] = (c[r.category] || 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(
    () => (active === "all" ? rows : rows.filter((r) => r.category === active)),
    [rows, active],
  );

  return (
    <div>
      <div className="flex items-center gap-1 mb-3 border-b border-white/[0.06]">
        {CATS.map((c) => {
          const isActive = active === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c.id)}
              className={`relative -mb-px px-3 py-2 text-xs transition-colors ${
                isActive
                  ? "text-white border-b-2 border-accent-primary"
                  : "text-light-fourth hover:text-white border-b-2 border-transparent"
              }`}
            >
              {c.label}{" "}
              <span className="opacity-60 tabular-nums">
                {counts[c.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="divide-y divide-white/[0.04] ring-1 ring-white/[0.06] rounded-xl overflow-hidden bg-zinc-950">
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-sm text-light-fourth text-center">
            No tools in this category yet.
          </li>
        )}
        {filtered.map((t) => (
          <li key={t.name}>
            <Link
              href={`/admin/tools/${encodeURIComponent(slugifyAscii(t.name))}`}
              className="block px-4 py-3 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Wrench className="w-4 h-4 text-light-fourth shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">
                    {t.brand}{" "}
                    <span className="text-light-fourth">— {t.what}</span>
                  </div>
                  <div className="text-[10px] text-light-fourth/70 mt-0.5 uppercase tracking-wider">
                    {t.category}
                  </div>
                </div>
                {t.favorite && (
                  <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
