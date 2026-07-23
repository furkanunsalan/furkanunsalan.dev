"use client";

import { useEffect, useRef, useState } from "react";
import type { ContributionLevel, MergedContributions } from "@/lib/github";

const CELL = 12;
const GAP = 3;
const RADIUS = 2;

const EMPTY_FILL = "rgba(255,255,255,0.04)";

// Personal = indigo (accent), work = sky blue. Same opacity ramp per level.
const PERSONAL_RGB = "99,102,241";
const WORK_RGB = "14,165,233";

const PERSONAL_FILL: Record<ContributionLevel, string> = {
  0: EMPTY_FILL,
  1: `rgba(${PERSONAL_RGB},0.28)`,
  2: `rgba(${PERSONAL_RGB},0.5)`,
  3: `rgba(${PERSONAL_RGB},0.72)`,
  4: `rgba(${PERSONAL_RGB},1)`,
};
const WORK_FILL: Record<ContributionLevel, string> = {
  0: EMPTY_FILL,
  1: `rgba(${WORK_RGB},0.32)`,
  2: `rgba(${WORK_RGB},0.6)`,
  3: `rgba(${WORK_RGB},0.82)`,
  4: `rgba(${WORK_RGB},1)`,
};

type Focus = null | "personal" | "work";

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Hover = {
  date: string;
  personal: number;
  work: number;
  x: number;
  y: number;
};

export default function GithubCommitHistory() {
  const [data, setData] = useState<MergedContributions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [focus, setFocus] = useState<Focus>(null);
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
    return <div className="skeleton h-[160px] w-full rounded-xl" aria-hidden />;
  }

  const width = data.weeks.length * (CELL + GAP) - GAP;
  const height = 7 * (CELL + GAP) - GAP;

  const displayTotal =
    focus === "personal"
      ? data.totalPersonal
      : focus === "work"
        ? data.totalWork
        : data.totalPersonal + data.totalWork;

  const personalOpacity = focus === "work" ? 0.1 : 1;
  const workOpacity = focus === "personal" ? 0.1 : 1;

  const toggle = (kind: "personal" | "work") =>
    setFocus((f) => (f === kind ? null : kind));

  const btnStyle = (kind: "personal" | "work") =>
    focus === kind
      ? { color: `rgb(${kind === "work" ? WORK_RGB : PERSONAL_RGB})` }
      : undefined;
  const btnClass = (kind: "personal" | "work") => {
    const active = focus === kind;
    const dimmed = focus !== null && !active;
    return `transition-colors duration-200 hover:text-light-secondary ${
      active ? "" : dimmed ? "text-light-fourth/50" : "text-light-fourth"
    }`;
  };

  // Event delegation off the invisible interaction layer (which alone carries
  // the data-* attributes), so tooltip coords survive the SVG's responsive scale.
  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    const rect = target.closest("rect[data-date]") as SVGRectElement | null;
    if (!rect || !wrapRef.current) {
      setHover(null);
      return;
    }
    const bounds = wrapRef.current.getBoundingClientRect();
    setHover({
      date: rect.getAttribute("data-date")!,
      personal: Number(rect.getAttribute("data-personal") || "0"),
      work: Number(rect.getAttribute("data-work") || "0"),
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    });
  };

  return (
    <div ref={wrapRef} className="relative w-full animate-fade-in">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-base tabular-nums text-light-primary">
            {displayTotal.toLocaleString()}
          </span>
          <span className="text-xs text-light-fourth">contributions</span>
        </div>

        <div className="flex select-none items-center gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => toggle("work")}
            aria-pressed={focus === "work"}
            className={btnClass("work")}
            style={btnStyle("work")}
          >
            work
          </button>
          <span className="text-light-fourth/30">/</span>
          <button
            type="button"
            onClick={() => toggle("personal")}
            aria-pressed={focus === "personal"}
            className={btnClass("personal")}
            style={btnStyle("personal")}
          >
            personal
          </button>
        </div>
      </div>

      <div onPointerLeave={() => setHover(null)}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-auto w-full"
          role="img"
          aria-label={`${(data.totalPersonal + data.totalWork).toLocaleString()} GitHub contributions in the last year across personal and work accounts`}
          onPointerMove={handleMove}
        >
          {/* empty scaffold grid */}
          <g>
            {data.weeks.map((week, w) =>
              week.days.map((day, d) => (
                <rect
                  key={`g-${day.date}`}
                  x={w * (CELL + GAP)}
                  y={d * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  rx={RADIUS}
                  ry={RADIUS}
                  fill={EMPTY_FILL}
                />
              )),
            )}
          </g>

          {/* personal (indigo) */}
          <g
            className="transition-opacity duration-300"
            style={{ opacity: personalOpacity }}
          >
            {data.weeks.map((week, w) =>
              week.days.map((day, d) =>
                day.personalLevel > 0 ? (
                  <rect
                    key={`p-${day.date}`}
                    x={w * (CELL + GAP)}
                    y={d * (CELL + GAP)}
                    width={CELL}
                    height={CELL}
                    rx={RADIUS}
                    ry={RADIUS}
                    fill={PERSONAL_FILL[day.personalLevel]}
                  />
                ) : null,
              ),
            )}
          </g>

          {/* work (dark orange), screen-blended so overlaps stay visible */}
          <g
            className="transition-opacity duration-300"
            style={{ opacity: workOpacity, mixBlendMode: "screen" }}
          >
            {data.weeks.map((week, w) =>
              week.days.map((day, d) =>
                day.workLevel > 0 ? (
                  <rect
                    key={`w-${day.date}`}
                    x={w * (CELL + GAP)}
                    y={d * (CELL + GAP)}
                    width={CELL}
                    height={CELL}
                    rx={RADIUS}
                    ry={RADIUS}
                    fill={WORK_FILL[day.workLevel]}
                  />
                ) : null,
              ),
            )}
          </g>

          {/* invisible hit layer */}
          <g>
            {data.weeks.map((week, w) =>
              week.days.map((day, d) => (
                <rect
                  key={`h-${day.date}`}
                  x={w * (CELL + GAP)}
                  y={d * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  fill="transparent"
                  data-date={day.date}
                  data-personal={day.personal}
                  data-work={day.work}
                  className="hover:opacity-80"
                />
              )),
            )}
          </g>
        </svg>
      </div>

      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-white/[0.08] bg-zinc-950/95 px-2.5 py-1.5 text-xs shadow-[0_8px_24px_-12px_rgba(99,102,241,0.6)] backdrop-blur-sm animate-fade-in"
          style={{
            left: hover.x,
            top: hover.y - 10,
            animationDuration: "120ms",
          }}
        >
          <div className="mb-1 font-medium text-white">
            {formatDate(hover.date)}
          </div>
          <div className="flex items-center gap-1.5 tabular-nums">
            <span
              className="inline-block h-2 w-2 rounded-[2px]"
              style={{ background: `rgb(${PERSONAL_RGB})` }}
            />
            <span className="font-semibold text-light-secondary">
              {hover.personal}
            </span>
            <span className="text-light-fourth">personal</span>
          </div>
          <div className="flex items-center gap-1.5 tabular-nums">
            <span
              className="inline-block h-2 w-2 rounded-[2px]"
              style={{ background: `rgb(${WORK_RGB})` }}
            />
            <span className="font-semibold text-light-secondary">
              {hover.work}
            </span>
            <span className="text-light-fourth">work</span>
          </div>
        </div>
      )}
    </div>
  );
}
