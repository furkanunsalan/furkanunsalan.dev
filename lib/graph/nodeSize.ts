// The bookmarks graph's node-size model, ported from myne's
// `editor/src/host/notes/graphSettings.ts` (`myne-md/myne#727`).
//
// Node size is where "a hub reads as a landmark" is decided, and the two ends of
// the range are the two ways to get it wrong. Every node the same size is a
// uniform haze with no landmarks in it; a hub scaled by its raw degree is a
// planet with dust around it. What myne settled on is the middle: a base radius,
// plus a capped degree term, with a GENTLER dose and a LOWER cap for a tag hub
// because a tag's degree (how many bookmarks carry it) is a different quantity
// from a bookmark's (how many tags claim it).
//
// The mapping onto this graph:
//
//   myne            here
//   note            bookmark
//   tag node        tag hub
//   note's degree   how many tags claim the bookmark
//   tag's degree    how many bookmarks carry the tag
//
// One thing here is deliberately NOT carried over. myne reserves the LARGEST
// radius its settings panel can draw, so a size-slider drag is a repaint rather
// than a layout re-run (see `resolveReservedRadius` there). This site has no
// size control and no slider range, so the radius that is drawn is the radius
// that is reserved — the same number, with the one indirection removed. The
// collision guarantee is unchanged: nothing the reader can change can make a
// node grow into the room the layout already left for it.

/**
 * Base node radius, in graph units. myne's `nodeSize` default is 6, but this
 * graph does not want it: at the zoom the whole cloud fits at, 6 made the
 * leaves read as their own objects competing with the hubs rather than as
 * spokes around them. 4.5 keeps a leaf visible — well clear of the flat 3 that
 * read as dust — while leaving the hub as the thing the eye lands on.
 */
export const NODE_SIZE = 4.5;

/**
 * How strongly a bookmark's tag count grows its radius beyond
 * {@link NODE_SIZE}. Held below myne's 1.2 for the same reason: a leaf's size
 * should hint at how many tags claim it, not make a five-tag bookmark a third
 * the size of a hub.
 */
export const NODE_SIZE_STRENGTH = 0.9;

/**
 * The degree at which a node's radius stops growing. myne raised this 10 -> 20
 * with the curation pass, and the reason is this graph's reason exactly: it is
 * what lets a well-connected node read as a landmark rather than as a slightly
 * larger dot. Past it one hub cannot grow (or enlarge the targets around it)
 * without bound.
 */
export const MAX_DEGREE_FOR_SIZE = 20;

/**
 * How much larger a tag hub is than the base node radius, before its own degree
 * term. A tag over sixty bookmarks must NOT grow at the bookmark rate, or the
 * biggest tag in the graph is the largest object on screen by an order of
 * magnitude — the "planet" the reference's own plan warned about. It must still
 * grow, though: a size that ignored its count entirely made a hub
 * indistinguishable from its own spokes.
 *
 * Raised from 1.6 when the leaves came down, so the hubs keep the on-screen size
 * they had: the request was for smaller children, not a smaller hierarchy.
 */
export const TAG_NODE_RADIUS_FACTOR = 2.1;

/** A tag hub's degree dose as a fraction of a bookmark's. Expressed as a
 *  fraction so the relationship between the two is readable at the definition. */
export const TAG_NODE_DEGREE_DOSE = 0.5;

/** The tag degree at which a hub's radius stops growing, so a tag with ten
 *  thousand bookmarks is drawn no larger than one with twelve. */
export const TAG_NODE_MAX_DEGREE = 12;

/**
 * The visible gap the collision floor leaves BEYOND the radii it must clear
 * (myne's `COLLIDE_PADDING`). The floor itself is not invented here — it is the
 * sum of the radii the layout reserves around two nodes. What this adds is the
 * space between their discs, so "not overlapping" does not mean "touching".
 */
export const COLLIDE_PADDING = 7;

/**
 * A bookmark's radius: a base plus a capped tag-count term. The SINGLE formula
 * for drawing a bookmark and hit-testing it, so a click target cannot diverge
 * from what is drawn.
 */
export function resolveNodeRadius(
  nodeSize: number,
  nodeSizeStrength: number,
  degree: number,
  maxDegree: number,
): number {
  return nodeSize + nodeSizeStrength * Math.min(degree, maxDegree);
}

/** A tag hub's radius: the same shape as {@link resolveNodeRadius} with its own
 *  gentler dose and lower cap. See {@link TAG_NODE_RADIUS_FACTOR}. */
export function resolveTagNodeRadius(
  nodeSize: number,
  nodeSizeStrength: number,
  degree: number,
): number {
  return (
    nodeSize * TAG_NODE_RADIUS_FACTOR +
    nodeSizeStrength *
      TAG_NODE_DEGREE_DOSE *
      Math.min(degree, TAG_NODE_MAX_DEGREE)
  );
}
