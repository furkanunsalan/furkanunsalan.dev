// The graph's pointer-sequence policy, ported from myne's
// `editor/src/host/notes/graphPointerPolicy.ts` (`myne-md/myne#727`).
//
// The renderer's pointer handling is canvas plumbing and cannot be exercised
// without a canvas, which is exactly why the DECISION inside it is kept here:
// "a press that never moves is a click, a press that moves is a pan" is the
// rule that decides whether clicking a bookmark opens it or a slightly shaky
// hand scrolls the graph instead. Keeping it here means the rule is asserted
// directly instead of by driving a synthetic pointer into a canvas.
//
// One term of myne's vocabulary is deliberately NOT carried over: this graph
// does not let a node be dragged to a new position (there is no live simulation
// behind it, and `BookmarkGraph.tsx` has always said "no node dragging"), so a
// press that moves is a PAN whether or not it started on a node — the node
// under the press is only the click target. `node-place` is therefore absent
// from the intent type rather than being returned and ignored.

/** Screen pixels of movement below which a press is still a click. This repo's
 *  budget, not myne's 2: a press here opens a link in a new tab, so stray
 *  trackpad movement must not turn a click into a pan. */
export const DRAG_THRESHOLD_PX = 4;

/**
 * Whether movement of `dx, dy` screen pixels has become a drag.
 *
 * Per-axis summed rather than euclidean, matching the reference: a diagonal
 * nudge of (2,2) is 4, over a threshold of 4.
 */
export function crossedDragThreshold(dx: number, dy: number): boolean {
  return Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX;
}

/** What lifting the pointer means, given what the press hit and whether the
 *  pointer moved in between. */
export type ReleaseIntent =
  | { kind: "background-tap" }
  | { kind: "pan" }
  | { kind: "node-click"; id: string };

export function classifyRelease(
  pressedNodeId: string | null,
  moved: boolean,
): ReleaseIntent {
  if (pressedNodeId === null) {
    return moved ? { kind: "pan" } : { kind: "background-tap" };
  }
  // A press that moved pans the graph and is NOT a click, so the URL it landed
  // on is never opened by a drag.
  return moved ? { kind: "pan" } : { kind: "node-click", id: pressedNodeId };
}
