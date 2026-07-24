import { Link } from "@/components/_compat";
import type { Tool as Gadget } from "@/types";
import { ArrowUpRight } from "lucide-react";
import GadgetGlyph from "@/components/GadgetGlyph";

// tech / desk / other → friendlier zone titles for the drawing.
const ZONES: { key: string; label: string }[] = [
  { key: "tech", label: "Everyday Tech" },
  { key: "desk", label: "Desk Setup" },
  { key: "other", label: "Out & About" },
];

export default function GadgetsBlueprint({ gadgets }: { gadgets: Gadget[] }) {
  const byZone = new Map<string, Gadget[]>();
  for (const g of gadgets) {
    const arr = byZone.get(g.category) ?? [];
    arr.push(g);
    byZone.set(g.category, arr);
  }
  const orderedZones = [
    ...ZONES.filter((z) => byZone.has(z.key)),
    ...[...byZone.keys()]
      .filter((k) => !ZONES.some((z) => z.key === k))
      .map((k) => ({ key: k, label: k })),
  ];

  let idx = 0;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-24 sm:px-6 lg:px-8">
      <div className="space-y-12">
        {orderedZones.map((zone) => {
          const items = byZone.get(zone.key) ?? [];
          return (
            <section key={zone.key}>
              <div className="mb-5 flex items-center gap-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/90">
                  {zone.label}
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
                <span className="font-mono text-[10px] tabular-nums text-light-fourth/60">
                  {String(items.length).padStart(2, "0")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((g) => (
                  <Plate key={g.name} gadget={g} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Plate({ gadget }: { gadget: Gadget }) {
  const { brand, name, what, link, icon } = gadget;
  const title = [brand, name].filter(Boolean).join(" ");

  const inner = (
    <article className="group relative flex h-full flex-col rounded-lg bg-white/[0.015] p-4 ring-1 ring-white/[0.08] transition-colors duration-200 hover:bg-white/[0.03] hover:ring-white/25">
      {/* registration corner ticks */}
      <Tick className="left-1.5 top-1.5 border-l border-t" />
      <Tick className="right-1.5 top-1.5 border-r border-t" />
      <Tick className="bottom-1.5 left-1.5 border-b border-l" />
      <Tick className="bottom-1.5 right-1.5 border-b border-r" />

      {link && (
        <ArrowUpRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-light-fourth/50 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-primary" />
      )}

      <div className="flex h-16 items-center justify-center pt-2 text-light-third transition-colors duration-200 group-hover:text-accent-primary">
        <GadgetGlyph what={what} icon={icon} className="h-12 w-12" />
      </div>

      <div className="mt-3">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-white">
          {title}
        </h3>
      </div>
    </article>
  );

  if (link) {
    return (
      <Link
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

function Tick({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-2 w-2 border-white/20 transition-colors duration-200 group-hover:border-accent-primary/50 ${className}`}
    />
  );
}
