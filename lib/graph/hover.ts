// The bookmarks graph's highlight policy, ported from myne's
// `editor/src/host/notes/graphHover.ts` (`myne-md/myne#727`), plus the search
// layer this graph already had.
//
// "What does hovering a node highlight" is a decision rather than plumbing: the
// node itself, its immediate neighbours, and the edges that touch it stay at
// full strength while everything else recedes. Keeping it here means the answer
// is asserted directly instead of being inferred from what a canvas happened to
// paint.
//
// The search layer is the one thing myne's module has no equivalent of: this
// graph can be searched, and a search's matches are a SECOND answer to the same
// question. It takes precedence, because the user typed it deliberately and a
// pointer passing over the graph must not overwrite it.

/** Alpha applied to everything outside a highlight. Chosen so a dimmed element
 *  still reads as present, this is a graph being read, not a modal hiding
 *  things, while the highlighted structure is unambiguous. It is a canvas draw
 *  value rather than a design token because the token sheet has no opacity axis
 *  at all; the COLOURS being dimmed are all token-derived. */
export const HOVER_DIM_ALPHA = 0.18;

/** Resting edge alpha. Edges were drawn brighter, which makes a dense hub read
 *  as a solid fan of lines with dots on the ends — the connections out-weigh
 *  the bookmarks, and the bookmarks are the content. This is the site's own
 *  resting weight (myne uses 0.5 against a different palette), kept so the
 *  un-hovered picture is unchanged. */
export const EDGE_REST_ALPHA = 0.06;

/** Alpha for an edge touching the hovered node: clearly the brightest thing on
 *  screen, because it is answering "which connections are this node's", but not
 *  a hard accent line across a whole hub. */
export const EDGE_LIT_ALPHA = 0.6;

/** Alpha for an edge with something hovered that it is not incident to. */
export const EDGE_DIM_ALPHA = 0.02;

/** The node ids and edge keys a highlight keeps at full strength. */
export interface HoverHighlight {
  /** The node the pointer is over. Carried explicitly rather than inferred from
   *  the membership sets, because the renderer draws an anchor ring on it and
   *  "the node that is in `nodes` and is not a neighbour" is not a question the
   *  sets can answer. */
  id: string;
  /** The hovered node and its immediate neighbours. */
  nodes: ReadonlySet<string>;
  /** {@link edgeKey} of every edge incident to the hovered node. */
  edges: ReadonlySet<string>;
}

/** The classification being blended toward right now: what the pointer is on,
 *  what the search matched, or both. */
export interface DimSource {
  hover: HoverHighlight | null;
  matches: ReadonlySet<string> | null;
}

/** The dim state after a hover or search change. */
export interface Dimming {
  source: DimSource | null;
  target: 0 | 1;
}

/**
 * The key identifying an edge. Direction is part of the identity, matching
 * myne: this graph's links happen to be undirected, but an incident edge is
 * looked up in the direction the link was built, so one key is enough and the
 * shape stays the reference's. A `\u0000` separator cannot occur in a node id.
 */
export function edgeKey(source: string, target: string): string {
  return `${source}\u0000${target}`;
}

/**
 * Build the highlight for a hovered node, or `null` when nothing is hovered.
 * `links` is the renderer's own link list, already resolved to ids.
 */
export function buildHoverHighlight(
  hoveredId: string | null,
  links: ReadonlyArray<{ source: string; target: string }>,
): HoverHighlight | null {
  if (hoveredId === null) return null;
  const nodes = new Set<string>([hoveredId]);
  const edges = new Set<string>();
  for (const l of links) {
    if (l.source !== hoveredId && l.target !== hoveredId) continue;
    edges.add(edgeKey(l.source, l.target));
    nodes.add(l.source);
    nodes.add(l.target);
  }
  return { id: hoveredId, nodes, edges };
}

/** Whether a node is at full strength under a highlight. */
export function nodeIsLit(hover: HoverHighlight | null, id: string): boolean {
  return hover === null || hover.nodes.has(id);
}

/** Whether an edge is at full strength under a highlight. */
export function edgeIsLit(
  hover: HoverHighlight | null,
  source: string,
  target: string,
): boolean {
  return hover === null || hover.edges.has(edgeKey(source, target));
}

/** The alpha to draw an element at, given whether it is lit. */
export function highlightAlpha(
  hover: HoverHighlight | null,
  lit: boolean,
): number {
  return hover === null || lit ? 1 : HOVER_DIM_ALPHA;
}

/**
 * The dim state a hover/search change leads to.
 *
 * The subtle half is the NO-OP branch. When a highlight ENDS the source is
 * deliberately KEPT rather than dropped: the renderer blends from the source's
 * alphas down to the resting ones over a couple of hundred milliseconds, and
 * dropping the classification on the same frame would collapse every alpha to
 * its resting value at once — the very snap the animation exists to remove. The
 * renderer clears `source` once its dim reaches 0.
 */
export function dimmingAfter(
  source: DimSource | null,
  hover: HoverHighlight | null,
  matches: ReadonlySet<string> | null,
): Dimming {
  if (hover !== null || matches !== null) {
    return { source: { hover, matches }, target: 1 };
  }
  return { source, target: 0 };
}

/** Blend an element's resting alpha toward a highlighted classification. `dim`
 *  is 0 at rest and 1 fully classified, so a hover DIMS IN and DIMS OUT instead
 *  of switching between two alphas on one frame. The ends are snapped rather
 *  than computed, so an element actually reaches its target alpha instead of
 *  landing a float epsilon away from it. */
export function blendAlpha(rest: number, target: number, dim: number): number {
  if (dim <= 0) return rest;
  if (dim >= 1) return target;
  return rest + (target - rest) * dim;
}

/**
 * The alpha a node is heading for: full strength when lit, otherwise the dim
 * value. A search's matches win over a hover, because the pointer must not
 * overwrite what the user typed.
 */
export function nodeTargetAlpha(source: DimSource | null, id: string): number {
  if (source === null) return 1;
  const lit =
    source.matches !== null
      ? source.matches.has(id)
      : nodeIsLit(source.hover, id);
  return lit ? 1 : HOVER_DIM_ALPHA;
}

/**
 * The alpha an EDGE is heading for. Separate from {@link nodeTargetAlpha}
 * because edges and nodes want different weights: dimming a node hides content,
 * while dimming an edge reveals it.
 *
 * A search quiets the whole edge layer rather than lighting the matching
 * nodes' edges: the answer to a search is the set of nodes, and drawing their
 * connections as well would be the hairball the search was meant to cut
 * through. That is the behaviour the pre-port renderer had, kept intact.
 */
export function edgeTargetAlpha(
  source: DimSource | null,
  sourceId: string,
  targetId: string,
): number {
  if (source === null) return EDGE_REST_ALPHA;
  if (source.matches !== null) return EDGE_DIM_ALPHA;
  if (source.hover !== null) {
    return edgeIsLit(source.hover, sourceId, targetId)
      ? EDGE_LIT_ALPHA
      : EDGE_DIM_ALPHA;
  }
  return EDGE_REST_ALPHA;
}

/** Whether an edge is drawn in the accent rather than the neutral stroke —
 *  the edges answering "which connections are this node's". */
export function edgeShowsAccent(
  source: DimSource | null,
  sourceId: string,
  targetId: string,
): boolean {
  if (source === null || source.matches !== null || source.hover === null) {
    return false;
  }
  return edgeIsLit(source.hover, sourceId, targetId);
}
