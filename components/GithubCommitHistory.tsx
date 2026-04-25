"use client";

import { useEffect, useState } from "react";
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

export default function GithubCommitHistory() {
  const [data, setData] = useState<ContributionCalendar | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    return <div className="card h-[140px] w-full animate-pulse" aria-hidden />;
  }

  const width = data.weeks.length * (CELL + GAP) - GAP;
  const height = 7 * (CELL + GAP) - GAP;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto"
        role="img"
        aria-label={`${data.total} GitHub contributions in the last year`}
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
            >
              <title>
                {day.count} contribution{day.count === 1 ? "" : "s"} on{" "}
                {formatDate(day.date)}
              </title>
            </rect>
          )),
        )}
      </svg>
    </div>
  );
}
