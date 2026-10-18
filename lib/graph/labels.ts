// Zoom-based label visibility — the same idea as Obsidian's and myne's graphs:
// labels belong to a zoom level, not to the graph. At the framing that shows the
// whole cloud there is no room for 66 labels, so they crowd into an unreadable
// mat; once a node's neighbourhood fills the screen they are the only way to tell
// nodes apart, and every hub label should behave the same way — a hub that keeps
// its name while its neighbours lose theirs is not a hierarchy anyone asked for.
//
// The thresholds are RELATIVE to the fitted zoom rather than absolute. myne uses
// an absolute 1.4, which is safe for a vault graph that fits well above 1; this
// graph fits around 0.7, and the fit varies with the viewport (0.4 on a short
// window, up to 1.5 on a large one). An absolute threshold would therefore either
// hide every label on a small window or show all of them on a large one. Keyed to
// the fit, the default view always shows labels and zooming out from there fades
// them out — which is the behaviour being asked for.

/** Fraction of the fitted zoom at which labels are fully visible. Below this
 *  they start to go, so the default view is unaffected. */
export const LABEL_FADE_FROM = 0.72;

/** Fraction of the fitted zoom at which labels are gone entirely. Reaching it
 *  means the cloud is drawn at half the size the fit chose, which is well past
 *  the point where 12px labels have anywhere to sit. */
export const LABEL_FADE_TO = 0.5;

/** Label opacity (0..1) for a zoom level, given the zoom the initial fit chose.
 *  Smoothstepped rather than linear so labels do not pop on at the top of the
 *  range or linger at the bottom. */
export function labelFade(k: number, kFit: number): number {
  if (!(kFit > 0) || !Number.isFinite(k)) return 1;
  const rel = k / kFit;
  if (rel >= LABEL_FADE_FROM) return 1;
  if (rel <= LABEL_FADE_TO) return 0;
  const t = (rel - LABEL_FADE_TO) / (LABEL_FADE_FROM - LABEL_FADE_TO);
  return t * t * (3 - 2 * t);
}

/** Below this the label pass is skipped outright — there is no point measuring
 *  and collision-testing 66 labels to draw them at 2% opacity. */
export const LABEL_FADE_MIN = 0.02;
