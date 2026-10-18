// Presence animation for the graph's hover card, and for the dim layer that
// accompanies it.
//
// myne draws its hover detail ON the canvas, so it has no card to ease in — the
// timing decisions here are this port's own, taken from the same design system
// band the camera tween uses. What they share with myne's module is the reason
// they exist: a highlight that switches on one frame reads as a glitch, so the
// card settles in and the dim fades in and out rather than snapping.
//
// The numbers are decisions, not arithmetic:
//
//   - 220 ms in: long enough to read as motion, short enough that the detail is
//     there before the pointer has finished arriving;
//   - 160 ms out: a dismissal should leave faster than an arrival settles, so
//     the card gets out of the way of the next one;
//   - the dim layer mirrors those two, and is separate because it is driven per
//     element in the render loop rather than by the card's DOM.

import { easeOutCubic } from "./camera";

/** How long the hover card takes to settle in. */
export const HOVER_CARD_IN_MS = 220;
/** How long the hover card takes to leave. */
export const HOVER_CARD_OUT_MS = 160;
/** How long the highlight dim takes to reach full strength. */
export const HOVER_DIM_IN_MS = 200;
/** How long the highlight dim takes to release. */
export const HOVER_DIM_OUT_MS = 160;

/** The card starts slightly small and slightly low, so it settles into place
 *  rather than appearing fully formed. Both are small: this is a tooltip, not
 *  an entrance. */
export const HOVER_CARD_SCALE_FROM = 0.96;
export const HOVER_CARD_LIFT_PX = 6;

/**
 * Advance a 0→1 presence value toward `target`, taking `inMs` one way and
 * `outMs` the other. Frame-rate independent (the caller passes its own delta),
 * and it LANDS exactly on the target rather than approaching it asymptotically
 * — a fading card that never quite reaches 0 would never unmount.
 */
export function advancePresence(
  value: number,
  target: 0 | 1,
  dtMs: number,
  inMs: number,
  outMs: number,
): number {
  if (value === target) return target;
  const duration = target === 1 ? inMs : outMs;
  const step = duration <= 0 ? 1 : dtMs / duration;
  const next = value + (target === 1 ? step : -step);
  return next <= 0 ? 0 : next >= 1 ? 1 : next;
}

/** The style a hover card at `progress` should be drawn with: opacity is
 *  linear, so the card is legible through the whole fade, while the scale and
 *  the lift settle on an ease-out so the arrival decelerates instead of
 *  arriving at a constant speed. */
export function hoverCardFrame(progress: number): {
  opacity: number;
  scale: number;
  lift: number;
} {
  const p = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;
  const settled = easeOutCubic(p);
  return {
    opacity: p,
    scale: HOVER_CARD_SCALE_FROM + (1 - HOVER_CARD_SCALE_FROM) * settled,
    lift: (1 - settled) * HOVER_CARD_LIFT_PX,
  };
}
