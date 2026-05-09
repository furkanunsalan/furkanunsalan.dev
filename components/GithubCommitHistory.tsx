"use client";

import { useEffect, useRef, useState } from "react";
import type { ContributionCalendar } from "@/lib/github";

const CELL = 12;
const GAP = 3;
const RADIUS = 2;

const LEVEL_FILL: Record<number, string> = {
  0: "rgba(255,255,255,0.04)",
  1: "rgba(99,102,241,0.25)",
  2: "rgba(99,102,241,0.45)",
  3: "rgba(99,102,241,0.7)",
  4: "rgba(99,102,241,1)",
};

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Hover = { date: string; count: number; x: number; y: number };

export default function GithubCommitHistory() {
  const [data, setData] = useState<ContributionCalendar | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/github/contributions")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load contributions");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="text-sm text-light-fourth">
        Could not load contribution graph.
      </div>
    );
  }

  if (!data) {
    return <div className="skeleton h-[140px] w-full rounded-xl" aria-hidden />;
  }

  const width = data.weeks.length * (CELL + GAP) - GAP;
  const height = 7 * (CELL + GAP) - GAP;

  // Event delegation: read date/count from the rect's data attributes and
  // compute tooltip coords relative to the wrapper so positioning survives
  // the SVG's responsive scaling.
  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    const rect = target.closest("rect[data-date]") as SVGRectElement | null;
    if (!rect || !wrapRef.current) {
      setHover(null);
      return;
    }
    const date = rect.getAttribute("data-date")!;
    const count = Number(rect.getAttribute("data-count") || "0");
    const bounds = wrapRef.current.getBoundingClientRect();
    setHover({
      date,
      count,
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    });
  };

  return (
    <div
      ref={wrapRef}
      className="relative w-full animate-fade-in"
      onPointerLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto"
        role="img"
        aria-label={`${data.total} GitHub contributions in the last year`}
        onPointerMove={handleMove}
      >
        {data.weeks.map((week, w) =>
          week.days.map((day, d) => (
            <rect
              key={day.date}
              x={w * (CELL + GAP)}
              y={d * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={RADIUS}
              ry={RADIUS}
              fill={LEVEL_FILL[day.level]}
              data-date={day.date}
              data-count={day.count}
              className="transition-[fill,opacity] duration-200 hover:opacity-80"
            />
          )),
        )}
      </svg>

      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap bg-zinc-950/95 border border-white/[0.08] shadow-[0_8px_24px_-12px_rgba(99,102,241,0.6)] backdrop-blur-sm animate-fade-in"
          style={{
            left: hover.x,
            top: hover.y - 10,
            animationDuration: "120ms",
          }}
        >
          <span className="text-accent-primary font-semibold tabular-nums">
            {hover.count}
          </span>
          <span className="text-light-secondary/90">
            {" "}
            contribution{hover.count === 1 ? "" : "s"} on{" "}
          </span>
          <span className="text-white font-medium">
            {formatDate(hover.date)}
          </span>
        </div>
      )}
    </div>
  );
}
