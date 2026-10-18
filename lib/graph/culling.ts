// Viewport culling math for the bookmarks graph, ported from myne's
// `editor/src/host/notes/graphCulling.ts`.
//
// The graph only grows, and at a fitted zoom most of it is off-screen, so
// "what is on screen?" is asked every frame. Keeping it here means the answer
// is asserted directly instead of being inferred from what a canvas happened to
// paint.
//
// All coordinates are GRAPH-space (pre-view-transform), matching the layout
// x/y the physics produces. The view transform maps graph → screen as
// `screen = graph * k + translate`, so the visible screen box [0,w]×[0,h]
// back-projects to the graph box computed here.

/** The renderer's pan/zoom transform: translate `(x,y)` then scale `k`. */
export interface ViewTransform {
  x: number;
  y: number;
  k: number;
}

/** An axis-aligned graph-space rectangle. */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * The graph-space rectangle currently visible in a `width`×`height` canvas
 * under `view`, grown by `margin` graph units on every side (so a node whose
 * centre is just off-screen but whose radius or label pokes in is not culled).
 */
export function visibleBounds(
  view: ViewTransform,
  width: number,
  height: number,
  margin = 0,
): Bounds {
  const { x, y, k } = view;
  // `(0 - x)` rather than `-x` so an x of 0 yields +0, not -0 (harmless for the
  // >=/<= comparisons, but keeps the bounds clean for equality/serialization).
  return {
    minX: (0 - x) / k - margin,
    minY: (0 - y) / k - margin,
    maxX: (width - x) / k + margin,
    maxY: (height - y) / k + margin,
  };
}

/** Whether a node's centre lies within `bounds`. */
export function isNodeVisible(
  node: { x: number; y: number },
  bounds: Bounds,
): boolean {
  return (
    node.x >= bounds.minX &&
    node.x <= bounds.maxX &&
    node.y >= bounds.minY &&
    node.y <= bounds.maxY
  );
}

/**
 * Whether an edge is worth drawing: kept when EITHER endpoint is inside
 * `bounds`. A long segment that crosses the viewport with BOTH endpoints far
 * outside is culled — the same accepted, rare approximation myne documents,
 * which avoids a full segment-vs-rect intersection test per edge.
 */
export function isEdgeVisible(
  a: { x: number; y: number },
  b: { x: number; y: number },
  bounds: Bounds,
): boolean {
  return isNodeVisible(a, bounds) || isNodeVisible(b, bounds);
}
