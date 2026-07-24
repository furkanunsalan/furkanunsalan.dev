"use client";

import React, { useEffect, useRef, useState } from "react";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

// One odometer reel: a stacked 0-9 column clipped to a single line, shifted so
// the active digit shows. Value changes (per tick, or the initial roll-in from
// 0) animate via the transform transition. An invisible copy of the digit sits
// in normal flow so the browser gives the reel a real text baseline (a clipped
// inline-block otherwise baselines to its bottom edge, which nudges the digits
// off the surrounding text — most visible at the small mobile size).
function Reel({ value, animate }: { value: number; animate: boolean }) {
  return (
    <span className="relative inline-block h-[1em] leading-[1em]" aria-hidden>
      <span className="invisible">{value}</span>
      <span className="absolute inset-0 overflow-hidden">
        <span
          className="block transition-transform duration-[600ms] ease-out"
          style={{ transform: `translateY(-${animate ? value : 0}em)` }}
        >
          {DIGITS.map((n) => (
            <span key={n} className="block h-[1em] leading-[1em]">
              {n}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

const Time: React.FC<{ location: string; shortName: string }> = (props) => {
  const [time, setTime] = useState<string>("");
  // Starts false so digit reels mount at 0, then flips on the next frame so
  // they roll up into the real time — the "loading" animation.
  const [rolled, setRolled] = useState(false);
  const raf = useRef<number>();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: props.location,
          hour12: false,
        }).format(now),
      );
    };
    update();
    const interval = setInterval(update, 1000);
    raf.current = requestAnimationFrame(() => setRolled(true));
    return () => {
      clearInterval(interval);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [props.location]);

  return (
    <span aria-label={time ? `${time} @ ${props.shortName}` : undefined}>
      <span aria-hidden>
        {time
          .split("")
          .map((ch, i) =>
            /\d/.test(ch) ? (
              <Reel key={i} value={Number(ch)} animate={rolled} />
            ) : (
              <span key={i}>{ch}</span>
            ),
          )}
        {time && <> @ {props.shortName}</>}
      </span>
    </span>
  );
};

export default Time;
