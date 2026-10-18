// The graph camera and its tween, ported from myne's `graphCamera.ts` +
// `graphCameraTween.ts` (`myne-md/myne#727`), as one pure module.
//
// The camera used to be ASSIGNED here: `fitTo` computed a transform and wrote
// it into the view, so the graph teleported between framings. A live graph
// cannot do that, because the one thing that reads as "a picture" rather than
// "a place" is a viewport that jumps. Every PROGRAMMATIC move (fit, centerOn,
// a search hit, the wheel) now tweens; only a gesture that the hand is driving
// stays 1:1, because a tween there reads as the interface lagging behind it.
//
// Two things here are decisions rather than arithmetic:
//
//   - the DURATION is in the 250-350 ms band, so a move is legible without
//     making the user wait for the interface;
//   - the ZOOM interpolates geometrically rather than linearly. Halfway through
//     a 1x to 4x zoom, a linear ramp is at 2.5x, which reads as "slowing down
//     at the end" to the eye; the geometric midpoint is 2x, which reads as
//     even.
//
// Reducing motion is NOT handled here. The gate is a JavaScript media-query
// read in the renderer, because a CSS media query provably cannot reach canvas
// animation; this module only knows how to move the camera.

import type { ViewTransform } from "./culling";

/** How long a programmatic camera move takes. Inside the 250-350 ms band the
 *  design system uses for a transition that must be noticed but not waited on. */
export const CAMERA_TWEEN_MS = 280;

/** Wheel-zoom clamp. The floor is lower than the fit floor so that a wheel-out
 *  can pull back past a fitted cloud, and the ceiling stays where this graph's
 *  hand-written wheel handler always put it. */
export const K_MIN = 0.15;
export const K_MAX = 4;

/** Clamp a zoom level into the supported range. */
export function clampK(k: number): number {
  return Math.max(K_MIN, Math.min(K_MAX, k));
}

function clamp01(t: number): number {
  return t <= 0 ? 0 : t >= 1 ? 1 : t;
}

/** Standard ease-out cubic: fast at the start, settling at the end. */
export function easeOutCubic(t: number): number {
  const c = clamp01(t);
  return 1 - (1 - c) ** 3;
}

/**
 * The view transform at `progress` (0 to 1) between two framings, out of range
 * clamped. Zoom is interpolated geometrically so the perceived zoom rate is
 * even; pan is linear.
 */
export function tweenTransform(
  from: ViewTransform,
  to: ViewTransform,
  progress: number,
): ViewTransform {
  const t = easeOutCubic(progress);
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    k: from.k * (to.k / from.k) ** t,
  };
}

// Zoom the fit is allowed to choose. The floor keeps a wide cloud readable, the
// ceiling stops a two-node graph from filling the screen — the same budget the
// assigned version used, so the framing itself does not change with this port.
const FIT_K_MIN = 0.4;
const FIT_K_MAX = 1.5;
/** How much of the box the cloud may fill, per axis. */
const FIT_FILL_X = 0.78;
const FIT_FILL_Y = 0.72;
/** Fraction of extreme positions trimmed off each axis before measuring, so a
 *  few escaped outliers don't blow up the framing — the dense cluster fills the
 *  view; stragglers sit just past the edges. This is the site's own framing
 *  rule (myne fits the raw bounding box), kept so the opening picture is
 *  unchanged. */
const FIT_TRIM = 0.03;

/**
 * The view that frames `positions` in a `width`×`height` box, centring the
 * trimmed bounding box and clamping the zoom to the fit range.
 */
export function fitTransform(
  positions: ReadonlyArray<{ x: number; y: number }>,
  width: number,
  height: number,
): ViewTransform {
  if (positions.length === 0) return { x: 0, y: 0, k: 1 };
  const xs = positions.map((p) => p.x).sort((a, b) => a - b);
  const ys = positions.map((p) => p.y).sort((a, b) => a - b);
  const lo = Math.floor(positions.length * FIT_TRIM);
  const hi = Math.min(
    positions.length - 1,
    Math.ceil(positions.length * (1 - FIT_TRIM)),
  );
  const minX = xs[lo];
  const maxX = xs[hi];
  const minY = ys[lo];
  const maxY = ys[hi];
  const bw = maxX - minX || 1;
  const bh = maxY - minY || 1;
  const k = Math.max(
    FIT_K_MIN,
    Math.min((width * FIT_FILL_X) / bw, (height * FIT_FILL_Y) / bh, FIT_K_MAX),
  );
  return {
    x: width / 2 - ((minX + maxX) / 2) * k,
    y: height / 2 - ((minY + maxY) / 2) * k,
    k,
  };
}
