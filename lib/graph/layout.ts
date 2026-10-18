// The bookmarks graph's layout kernel, ported from myne's
// `editor/src/host/notes/graphLayout.ts` + `graphLayoutStore.ts` +
// `graphColorGroups.ts` (`myne-md/myne#727`), as one pure module.
//
// WHY THIS IS NOT THE FORCE SIMULATION IT REPLACES. `BookmarkGraph.tsx` used to
// run an all-pairs repulsion + spring sim: REPULSION 4800, SPRING 0.025,
// REST 44, GRAVITY 0.03, 420 settle ticks, plus 2.8x extra hub-to-hub repulsion
// bolted on to keep the tag labels apart. Every one of those numbers is a
// compromise between two things it cannot do at once: repulsion wants to push
// the cloud apart (and with a 4800 magnitude it wins outright, which is why the
// hubs drifted to the edges of a several-thousand-unit cloud and the camera,
// which fits the cloud, zoomed out until the leaves were dust), while nothing
// in the kernel says what the picture should look like. It also SEEDS WITH
// `Math.random()`, so the same bookmarks laid out twice were two different
// pictures.
//
// myne answers the same question with a d3-force settle and gets the picture
// this graph wants: a hub in the middle of its own cluster with its leaves
// spread around it, clusters held apart by a collision floor that grows with
// degree, and the whole cloud held together by per-node gravity (forceX/forceY,
// CENTER_GRAVITY 0.07 — see `CENTER_GRAVITY` there; `forceCenter` alone moves
// only the centroid and cannot compact anything, and an orphan with no links
// feels no force at all without it). Its shape is not a property of the force
// VALUES, it is the equilibrium those forces settle into.
//
// WHAT IS PORTED HERE, AND WHAT IS COMPUTED INSTEAD. This graph is a bipartite
// star forest — tag hubs with bookmark leaves — which is a strictly easier
// problem than myne's note graph, because the cluster of every leaf is KNOWN
// rather than inferred. The settled arrangement of a hub and its leaves under
// myne's forces is symmetric, and a symmetric equilibrium can be written down
// instead of simulated:
//
//   link force / forceX + forceY   ->  every leaf sits at ONE radius from its
//                                      hub, evenly spaced in angle
//   collide (hub vs leaf)          ->  that radius is at least
//                                      hubRadius + leafRadius + COLLIDE_PADDING
//   collide (leaf vs leaf)         ->  at that density, the chord between two
//                                      neighbours must clear the same floor,
//                                      which is a radius the leaf count sets
//   collide (cluster vs cluster)   ->  cluster discs that never touch
//   forceX + forceY (centering)    ->  a compaction pass that pulls every
//                                      cluster toward the origin for as long as
//                                      the collision floor allows
//
// So this module COMPUTES the equilibrium rather than relaxing into it. That is
// what makes it deterministic (no `Math.random`, myne's FNV-1a id hash for the
// one free parameter, an angle phase), instant (no 420-tick settle before the
// first frame), and testable — "the leaves are at one radius at even angles" is
// an assertion rather than a tolerance.
//
// ONE DELIBERATE DEPARTURE, and it is this graph's own shape rather than a
// preference. myne's leaves sit on a SINGLE ring, and for a note graph that is
// enough because a note's link count is small. A tag hub's degree is unbounded:
// MIN_TAG 4 and a 600-bookmark cap still leave a popular tag claiming a hundred
// plus bookmarks. On one ring that is radius ~24 * count / 2pi — a 700-unit
// dandelion for the top tag, which alone would set the camera's zoom and put
// the leaves back under 4px on screen, i.e. the exact bug being fixed. The
// chord constraint is therefore solved for a CAPACITY and any overflow spills
// onto the next concentric ring, one `spacing` further out. Every ring is still
// a uniform-radius, even-angle ring; a big cluster reads as a wheel rather than
// as one huge hoop, and stays a hub-and-spoke cluster.
//
// NOT ported, with reasons: the worker/streaming protocol (nothing to settle
// into — this layout is pre-settled and frozen, and the oneshot answer is
// cheap), drag hold/release/reheat (this graph has never let a node be dragged,
// see `lib/graph/pointer.ts`), and `resolveReservedRadius`'s resize-a-slider
// indirection (there is no size control here; the drawn radius IS the reserved
// one — see `lib/graph/nodeSize.ts`).

import {
  COLLIDE_PADDING,
  MAX_DEGREE_FOR_SIZE,
  NODE_SIZE,
  NODE_SIZE_STRENGTH,
  resolveNodeRadius,
  resolveTagNodeRadius,
} from "./nodeSize";

/** A node as the layout needs it: the API's own shape, minus everything only
 *  the renderer wants. `weight` is deliberately unused — the membership that
 *  drives the rings is read from the links, which is the truth the edges are
 *  drawn from. A size taken from a count that disagreed with the edges would be
 *  a hub sitting in a ring it does not own. */
export interface LayoutNodeInput {
  id: string;
  kind: "tag" | "bookmark";
  label: string;
  weight?: number;
  tags?: string[];
}

/** A link as `/api/karakeep/graph` emits it. */
export interface LayoutLinkInput {
  s: string;
  t: string;
}

/** A node with the position, drawn radius and cluster colour the renderer needs. */
export interface PlacedNode {
  id: string;
  x: number;
  y: number;
  /** Drawn radius in graph units — the same number the hit test uses. */
  radius: number;
  /** The hub whose ring this node sits on, or `null` for a peripheral node.
   *  A hub is its own cluster. */
  cluster: string | null;
  /** Index into {@link GROUP_COLORS}, or -1 for the neutral ink. */
  group: number;
}

/** One hub cluster's reserved disc. */
export interface PlacedCluster {
  id: string;
  x: number;
  y: number;
  /** Radius of the outermost ring, 0 for a hub with no leaves. */
  ring: number;
  /** Reserved disc: the outermost ring plus the largest leaf's radius plus the
   *  collide padding. Two of these may never come within {@link CLUSTER_GAP}. */
  radius: number;
  /** Leaves on the rings. */
  leaves: number;
}

export interface GraphLayoutResult {
  nodes: PlacedNode[];
  clusters: PlacedCluster[];
  /** Radius of the smallest circle around the origin that contains every
   *  cluster disc: the boundary the peripheral ring sits outside of. */
  cloudRadius: number;
  /** The largest drawn radius, for the renderer's culling margin. */
  maxRadius: number;
}

/**
 * The floor under a ring's radius (myne's `forceLinkDistance` 48, the distance
 * its link force holds a hub and its leaves at).
 *
 * Reduced from 48 deliberately, and the reduction is about THIS site's frame
 * rather than about myne's tuning. myne's layout box is a fixed 1000 units and
 * its camera fits the cloud, which here is a round cloud in a 16:9 viewport —
 * so the HEIGHT is what sets the zoom, and the leaves' on-screen size is
 * `ringRelativeSize * height / cloudDiameter`. A faithful 48 puts a realistic
 * cloud (dozens of clusters) at 866 units across and the leaves back under
 * 10px, which is the "everything reads as dust at the fitted zoom" complaint
 * with a nicer engine behind it. 32 keeps the ring at 2.2 leaf diameters, which
 * still reads as a hub with spokes, and keeps the leaves legible.
 */
export const RING_MIN = 32;

/**
 * The gap two cluster discs must keep beyond their own edges. Equal to the
 * collide padding because each disc ALREADY carries one (see
 * {@link PlacedCluster.radius}), so the nearest leaves of two neighbouring
 * clusters stand three paddings apart: clearly separated rather than merely
 * not overlapping, which is what makes a cluster read as a cluster.
 */
export const CLUSTER_GAP = COLLIDE_PADDING;

/** How far each candidate of the packing spiral is from the last, in graph
 *  units. Small enough to find a snug gap between clusters, large enough that
 *  packing dozens of them stays a few thousand distance checks. */
const SPIRAL_STEP = 6;

/** The packing spiral's angular advance — the golden angle, so candidates never
 *  repeat an angle, which is what makes `packClusters` find a free slot quickly
 *  rather than sampling the same ray over and over. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** How many times the compaction pass walks the clusters. Each pass may move
 *  every cluster once, so this is a ceiling on how settled the packing gets —
 *  not a settle budget, since the pass is a constraint solver rather than a
 *  simulation and converges long before this. */
const COMPACT_ITERATIONS = 24;

/** How far toward the origin one compaction step may move a cluster, as a
 *  fraction of its distance. This is this module's `forceX`/`forceY` gravity;
 *  a step this size reaches the collision floor in a handful of passes. */
const COMPACT_PULL = 0.4;

/** How many times a blocked compaction step is halved before it gives up on
 *  this pass. Without it a cluster stops a whole `COMPACT_PULL` short of the
 *  constraint boundary, and the packing stays visibly loose. */
const COMPACT_REFINEMENTS = 6;

/**
 * The categorical palette the clusters are coloured from (myne's
 * `GROUP_COLOR_KEYS`, reduced).
 *
 * Colour is what makes a cluster read as one object rather than as a hub with
 * some dots near it: the hub and its leaves share an ink, and the next cluster
 * is a different one. Every entry is a tailwind-400 sibling of the site's
 * `accent-primary`, chosen so it holds up against AMOLED black; the site's
 * token sheet has one accent hue and no categorical axis, so there is nothing
 * else here to hang a palette on. The first entry IS the accent's nearest
 * sibling, so the biggest cluster — which draws the most ink — carries the
 * site's own colour.
 *
 * Triplets rather than hex because the canvas needs `rgba()` with a per-element
 * alpha for the hover dim.
 */
export const GROUP_COLORS: ReadonlyArray<string> = [
  "129,140,248", // indigo-400
  "45,212,191", // teal-400
  "251,191,36", // amber-400
  "251,113,133", // rose-400
  "56,189,248", // sky-400
  "167,139,250", // violet-400
];

/** The ink a node with no cluster gets — the neutral slate every unclassified
 *  element recedes to (myne's `colNode`). */
export const NEUTRAL_INK = "148,163,184"; // slate-400

/** The ink a lit edge and the hovered node's anchor ring are drawn in. */
export const ACCENT_INK = GROUP_COLORS[0];

/** The colour a node's cluster gives it, or the neutral ink when it has none. */
export function inkFor(group: number): string {
  return group >= 0 && group < GROUP_COLORS.length
    ? GROUP_COLORS[group]
    : NEUTRAL_INK;
}

/** A node's slot on its ring. */
export interface RingSlot {
  radius: number;
  angle: number;
}

/**
 * FNV-1a over the id, as an unsigned 32-bit int (myne's `hashId`). Used only to
 * pick a stable phase per cluster — not a hash with any security duty.
 */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * A deterministic 0..1 draw from the id and a salt (myne's `draw`). The salt is
 * what makes two properties of one node independent while both stay
 * reproducible. This is the layout's ONLY source of variation, and it is a
 * function of the id, which is what makes a cold layout the same layout twice —
 * the property the sim this replaces gave up by seeding with `Math.random()`.
 */
export function hashUnit(id: string, salt: string): number {
  return (hashId(id + salt) % 1024) / 1024;
}

/**
 * How many leaves fit on a ring of `radius` without their discs coming closer
 * than `spacing`.
 *
 * The chord between two neighbours `2π/n` apart is `2 * radius * sin(π/n)`, and
 * the constraint `chord >= spacing` solved for `n` is this. Below `radius =
 * spacing / 2` no pair fits at all and the answer is one slot; the floor is
 * also what keeps a caller that hands in a too-small radius from getting zero
 * and dropping a leaf.
 */
export function ringCapacity(radius: number, spacing: number): number {
  if (radius <= 0 || spacing <= 0) return 1;
  const half = spacing / (2 * radius);
  if (half >= 1) return 1;
  return Math.max(1, Math.floor(Math.PI / Math.asin(half)));
}

/**
 * The concentric rings a cluster's leaves are spread over: `count` leaves, the
 * first ring at `innerRadius`, each further ring one `spacing` out.
 *
 * A ring's radius grows by `spacing` rather than by a fraction of itself
 * because `spacing` is also the radial clearance two adjacent rings need: at
 * that distance a leaf in one ring clears a leaf directly outside it by exactly
 * the collide padding, which is the tightest packing that is still a gap.
 */
export function spillRings(
  count: number,
  innerRadius: number,
  spacing: number,
): Array<{ radius: number; slots: number }> {
  const rings: Array<{ radius: number; slots: number }> = [];
  let remaining = count;
  let radius = innerRadius;
  // Every ring takes at least one leaf, so this runs at most `count` times; the
  // guard is a bound rather than a possibility.
  while (remaining > 0 && rings.length < count) {
    const slots = Math.min(remaining, ringCapacity(radius, spacing));
    rings.push({ radius, slots });
    remaining -= slots;
    radius += spacing;
  }
  return rings;
}

/**
 * Where `count` leaves sit around a hub: every leaf at its ring's radius, at an
 * even angular interval, on even-radius rings.
 *
 * `phase` rotates the whole cluster. It exists so two clusters do not present
 * their rings at the same angle — myne's own note is that a population which
 * settles onto one visible ring at one angle "read as beads", and the fix is
 * the same here: the phase is the cluster id's hash, so it is scattered and
 * still reproducible.
 *
 * Rings are rotated against each other by half a slot, so a leaf never sits
 * exactly behind the leaf inside it: a radial column of them would read as a
 * spoke of spokes rather than as a spread.
 */
export function leafSlots(
  count: number,
  innerRadius: number,
  spacing: number,
  phase: number,
): RingSlot[] {
  if (count <= 0) return [];
  const rings = spillRings(count, innerRadius, spacing);
  const slots: RingSlot[] = [];
  let placed = 0;
  for (let ri = 0; ri < rings.length; ri += 1) {
    const ring = rings[ri];
    const ringPhase = phase + (Math.PI * ri) / ring.slots;
    for (let i = 0; i < ring.slots && placed < count; i += 1, placed += 1) {
      slots.push({
        radius: ring.radius,
        angle: ringPhase + (2 * Math.PI * i) / ring.slots,
      });
    }
  }
  return slots;
}

/** A disc the packing pass places. */
export interface ClusterDisc {
  id: string;
  radius: number;
}

/** Whether two discs stand at least `gap` clear of each other. */
function separated(
  a: { x: number; y: number; radius: number },
  b: { x: number; y: number; radius: number },
  gap: number,
): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) >= a.radius + b.radius + gap;
}

/**
 * Place cluster discs so no two ever come within {@link CLUSTER_GAP} of each
 * other, largest first.
 *
 * The first disc takes the origin and each later one takes the first free
 * point on a golden-angle spiral, growing outward. Largest first because a
 * cluster that only fits in a big hole has to be placed while big holes are
 * still left; the other order strands it on the rim as a gap nobody can use.
 *
 * Deterministic, and no candidate is ever accepted without the gap being
 * checked — which is why "clusters never overlap" is a property of the
 * algorithm rather than something a test has to hope for. The search is BOUNDED
 * too: the last candidate's radius is the distance beyond which every placed
 * disc is cleared by construction, so the loop cannot fall off the end with a
 * cluster unplaced.
 */
export function packClusters(
  discs: ReadonlyArray<ClusterDisc>,
  gap: number,
): Array<{ id: string; radius: number; x: number; y: number }> {
  const order = [...discs].sort(
    (a, b) => b.radius - a.radius || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const placed: Array<{ id: string; radius: number; x: number; y: number }> =
    [];
  for (const disc of order) {
    if (placed.length === 0) {
      placed.push({ ...disc, x: 0, y: 0 });
      continue;
    }
    // The candidate beyond which every placed disc is clear: |candidate| is at
    // least every placed centre's distance plus that disc's own radius plus
    // this one's radius plus the gap, so no pair can be closer than the floor.
    const outermost = Math.max(
      ...placed.map((p) => Math.hypot(p.x, p.y) + p.radius),
    );
    const lastStep = Math.ceil((outermost + disc.radius + gap) / SPIRAL_STEP);
    let x = 0;
    let y = 0;
    for (let step = 1; step <= lastStep; step += 1) {
      const t = step * SPIRAL_STEP;
      const angle = step * GOLDEN_ANGLE;
      x = t * Math.cos(angle);
      y = t * Math.sin(angle);
      if (!placed.every((p) => separated(p, { ...disc, x, y }, gap))) continue;
      break;
    }
    placed.push({ ...disc, x, y });
  }
  return placed;
}

/**
 * Pull every cluster toward the origin for as long as the collision floor
 * allows — this module's `forceX`/`forceY`.
 *
 * A greedy constraint-preserving pass rather than a force: a move is tried, and
 * accepted only when it keeps every pair clear, with the step halved a few
 * times so a blocked cluster still lands against the constraint instead of
 * stopping a whole step short. Nothing here can produce an overlap, because
 * nothing is ever moved without the check.
 *
 * This is what "clusters pack tightly without touching" means in practice: the
 * spiral alone already separates them, and this is what closes the gaps the
 * spiral's sampling left.
 */
export function compactClusters(
  placed: ReadonlyArray<{ id: string; radius: number; x: number; y: number }>,
  gap: number,
  iterations = COMPACT_ITERATIONS,
): Array<{ id: string; radius: number; x: number; y: number }> {
  const out = placed.map((c) => ({ ...c }));
  for (let it = 0; it < iterations; it += 1) {
    for (const c of out) {
      if (c.x === 0 && c.y === 0) continue;
      let amount = COMPACT_PULL;
      for (let r = 0; r < COMPACT_REFINEMENTS; r += 1) {
        const moved = {
          ...c,
          x: c.x * (1 - amount),
          y: c.y * (1 - amount),
        };
        if (!out.every((o) => o === c || separated(o, moved, gap))) {
          amount /= 2;
          continue;
        }
        c.x = moved.x;
        c.y = moved.y;
        break;
      }
    }
  }
  return out;
}

/** Rank order for hubs: biggest first, ties by id, so the palette and the
 *  packing order are both a function of the data rather than of iteration
 *  order. */
function byRankThenId(
  rank: ReadonlyMap<string, number>,
): (a: LayoutNodeInput, b: LayoutNodeInput) => number {
  return (a, b) =>
    (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * Lay the bookmark graph out, frozen.
 *
 * Every input node comes back with a position; the ones no hub claims are
 * peripheral, on a ring outside every cluster (myne's note that gravity is what
 * pulls a linked node toward the picture and leaves an orphan on the rim is the
 * same observation from the other side — here the rim is where they are PUT
 * rather than where they end up).
 */
export function layoutGraph(input: {
  nodes: ReadonlyArray<LayoutNodeInput>;
  links: ReadonlyArray<LayoutLinkInput>;
}): GraphLayoutResult {
  const byId = new Map(input.nodes.map((n) => [n.id, n]));

  // --- membership -------------------------------------------------------
  // Tag <-> bookmark edges are the membership; anything else still counts for
  // degree, because a node's size should answer "how connected is this", which
  // is the question myne's `resolveNodeRadius` answers.
  const degree = new Map<string, number>();
  const claimed = new Map<string, string[]>(); // bookmark id -> tag ids
  for (const l of input.links) {
    const a = byId.get(l.s);
    const b = byId.get(l.t);
    if (!a || !b) continue; // an edge to a node the API dropped
    degree.set(a.id, (degree.get(a.id) ?? 0) + 1);
    degree.set(b.id, (degree.get(b.id) ?? 0) + 1);
    const hub = a.kind === "tag" ? a : b.kind === "tag" ? b : null;
    const leaf = hub === a ? b : a;
    if (hub === null || leaf.kind === "tag") continue;
    const list = claimed.get(leaf.id);
    if (list === undefined) claimed.set(leaf.id, [hub.id]);
    else list.push(hub.id);
  }

  const tagIds = input.nodes.filter((n) => n.kind === "tag").map((n) => n.id);
  const rank = new Map<string, number>(); // tag id -> how many bookmarks carry it
  for (const ids of claimed.values())
    for (const id of ids) rank.set(id, (rank.get(id) ?? 0) + 1);
  for (const id of tagIds) if (!rank.has(id)) rank.set(id, 0);

  const tags = input.nodes
    .filter((n) => n.kind === "tag")
    .slice()
    .sort(byRankThenId(rank));

  // --- colour -----------------------------------------------------------
  // myne hands the first colour to the biggest group. It cycles rather than
  // stopping at the palette's end because the groups here are not a handful of
  // user-authored rules: a hub per qualifying tag means dozens of clusters, and
  // leaving all but the first six neutral is the "no visible cluster structure"
  // this is meant to fix. A repeated ink is harmless because the clusters it
  // repeats across are separated by {@link CLUSTER_GAP} of empty space.
  const group = new Map<string, number>();
  tags.forEach((t, i) => group.set(t.id, i % GROUP_COLORS.length));

  // --- rings ------------------------------------------------------------
  // A bookmark joins ONE ring — the cluster of the tag that claims the most
  // bookmarks (ties by tag id). A leaf is placed once and drawn once; the edges
  // to its other tags still draw, which is exactly how myne's graph shows a note
  // that belongs to two groups.
  const leavesOf = new Map<string, string[]>();
  for (const [leafId, hubIds] of claimed) {
    const hubId = [...hubIds].sort(
      (a, b) =>
        (rank.get(b) ?? 0) - (rank.get(a) ?? 0) || (a < b ? -1 : a > b ? 1 : 0),
    )[0];
    const list = leavesOf.get(hubId);
    if (list === undefined) leavesOf.set(hubId, [leafId]);
    else list.push(leafId);
  }

  const radiusOf = (n: LayoutNodeInput): number =>
    n.kind === "tag"
      ? resolveTagNodeRadius(NODE_SIZE, NODE_SIZE_STRENGTH, rank.get(n.id) ?? 0)
      : resolveNodeRadius(
          NODE_SIZE,
          NODE_SIZE_STRENGTH,
          degree.get(n.id) ?? 0,
          MAX_DEGREE_FOR_SIZE,
        );

  const discs: ClusterDisc[] = [];
  const hubRadius = new Map<string, number>();
  const hubLeaves = new Map<string, string[]>();
  const slotOf = new Map<string, RingSlot>();
  for (const tag of tags) {
    const leaves = (leavesOf.get(tag.id) ?? []).slice().sort((a, b) => {
      const la = byId.get(a)?.label ?? a;
      const lb = byId.get(b)?.label ?? b;
      return la < lb ? -1 : la > lb ? 1 : a < b ? -1 : a > b ? 1 : 0;
    });
    const hubR = radiusOf(tag);
    hubRadius.set(tag.id, hubR);
    if (leaves.length === 0) continue; // nothing to ring: it goes peripheral
    // Every leaf on this cluster is spaced off the LARGEST of them, so the
    // chord constraint holds for any adjacent pair and the ring is a uniform
    // radius rather than one that steps inward for the small leaves.
    const widest = Math.max(...leaves.map((id) => radiusOf(byId.get(id)!)));
    const spacing = 2 * widest + COLLIDE_PADDING;
    const inner = Math.max(RING_MIN, hubR + widest + COLLIDE_PADDING);
    const slots = leafSlots(
      leaves.length,
      inner,
      spacing,
      hashUnit(tag.id, "#ring") * 2 * Math.PI,
    );
    leaves.forEach((id, i) => slotOf.set(id, slots[i]));
    hubLeaves.set(tag.id, leaves);
    const ring = slots[slots.length - 1].radius;
    discs.push({
      id: tag.id,
      radius: ring + widest + COLLIDE_PADDING,
    });
  }

  const packed = compactClusters(packClusters(discs, CLUSTER_GAP), CLUSTER_GAP);

  const position = new Map<string, { x: number; y: number; radius: number }>();
  const nodeCluster = new Map<string, string | null>();
  const clusters: PlacedCluster[] = [];
  for (const c of packed) {
    const hub = byId.get(c.id)!;
    const leaves = hubLeaves.get(c.id) ?? [];
    const ring = leaves.length
      ? Math.max(...leaves.map((id) => slotOf.get(id)!.radius))
      : 0;
    position.set(hub.id, { x: c.x, y: c.y, radius: hubRadius.get(c.id)! });
    nodeCluster.set(hub.id, c.id);
    clusters.push({
      id: c.id,
      x: c.x,
      y: c.y,
      ring,
      radius: c.radius,
      leaves: leaves.length,
    });
    for (const id of leaves) {
      const slot = slotOf.get(id)!;
      position.set(id, {
        x: c.x + slot.radius * Math.cos(slot.angle),
        y: c.y + slot.radius * Math.sin(slot.angle),
        radius: radiusOf(byId.get(id)!),
      });
      nodeCluster.set(id, c.id);
    }
  }

  // --- the periphery ----------------------------------------------------
  // Everything no ring claims: a bookmark the API gave no surviving tag, and a
  // hub whose bookmarks were all pulled into bigger clusters. They go on a ring
  // outside every cluster disc, and like a cluster's own rings they spill
  // outward when there are more of them than one circle holds.
  const cloudRadius = clusters.length
    ? Math.max(...clusters.map((c) => Math.hypot(c.x, c.y) + c.radius))
    : 0;
  const strays = input.nodes.filter((n) => !position.has(n.id));
  if (strays.length > 0) {
    const widest = Math.max(...strays.map(radiusOf));
    const spacing = 2 * widest + COLLIDE_PADDING;
    const inner = Math.max(RING_MIN, cloudRadius + widest + COLLIDE_PADDING);
    const slots = leafSlots(
      strays.length,
      inner,
      spacing,
      // Half a turn off the cluster phase, so the peripheral ring does not read
      // as the extension of one cluster's rings.
      Math.PI,
    );
    strays.forEach((n, i) => {
      const slot = slots[i];
      position.set(n.id, {
        x: slot.radius * Math.cos(slot.angle),
        y: slot.radius * Math.sin(slot.angle),
        radius: radiusOf(n),
      });
      nodeCluster.set(n.id, null);
    });
  }

  const nodes: PlacedNode[] = input.nodes.map((n) => {
    const p = position.get(n.id)!;
    const cluster = nodeCluster.get(n.id) ?? null;
    return {
      id: n.id,
      x: p.x,
      y: p.y,
      radius: p.radius,
      cluster,
      group: cluster === null ? -1 : (group.get(cluster) ?? -1),
    };
  });

  return {
    nodes,
    clusters,
    cloudRadius,
    maxRadius: nodes.length ? Math.max(...nodes.map((n) => n.radius)) : 0,
  };
}
