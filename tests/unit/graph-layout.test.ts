import { describe, it, expect } from "vitest";
import {
  CLUSTER_GAP,
  GROUP_COLORS,
  NEUTRAL_INK,
  RING_MIN,
  compactClusters,
  hashUnit,
  inkFor,
  layoutGraph,
  leafSlots,
  packClusters,
  ringCapacity,
  spillRings,
  type LayoutNodeInput,
} from "@/lib/graph/layout";
import {
  COLLIDE_PADDING,
  MAX_DEGREE_FOR_SIZE,
  NODE_SIZE,
  NODE_SIZE_STRENGTH,
  TAG_NODE_MAX_DEGREE,
  resolveNodeRadius,
  resolveTagNodeRadius,
} from "@/lib/graph/nodeSize";

/** The distance between two placed nodes, for the overlap invariant. */
function gap(
  a: { x: number; y: number; radius: number },
  b: { x: number; y: number; radius: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y) - (a.radius + b.radius);
}

// --- the node-size model ---------------------------------------------------

describe("node size", () => {
  it("grows a bookmark with its tag count, up to the cap", () => {
    const r = (d: number) =>
      resolveNodeRadius(NODE_SIZE, NODE_SIZE_STRENGTH, d, MAX_DEGREE_FOR_SIZE);
    // Derived from the constants, so retuning the size model does not require
    // rewriting the arithmetic here.
    expect(r(0)).toBe(NODE_SIZE);
    expect(r(1)).toBeCloseTo(NODE_SIZE + NODE_SIZE_STRENGTH, 6);
    expect(r(3)).toBeCloseTo(NODE_SIZE + NODE_SIZE_STRENGTH * 3, 6);
    // The cap: a node claimed by a hundred tags is drawn no larger than one
    // claimed by twenty.
    expect(r(20)).toBe(r(100));
    expect(r(20)).toBeCloseTo(
      NODE_SIZE + NODE_SIZE_STRENGTH * MAX_DEGREE_FOR_SIZE,
      6,
    );
  });

  it("keeps a tag hub markedly larger than its own leaves, without a planet", () => {
    const leaf = resolveNodeRadius(
      NODE_SIZE,
      NODE_SIZE_STRENGTH,
      1,
      MAX_DEGREE_FOR_SIZE,
    );
    const smallHub = resolveTagNodeRadius(NODE_SIZE, NODE_SIZE_STRENGTH, 4);
    const bigHub = resolveTagNodeRadius(NODE_SIZE, NODE_SIZE_STRENGTH, 60);
    // "Hubs are markedly larger than leaves" — the whole point of the model.
    expect(smallHub / leaf).toBeGreaterThan(1.5);
    expect(bigHub / leaf).toBeGreaterThan(2);
    // And not a planet: the gentler dose is capped, so a tag over sixty
    // bookmarks draws no larger than one over twelve.
    expect(bigHub).toBe(
      resolveTagNodeRadius(NODE_SIZE, NODE_SIZE_STRENGTH, TAG_NODE_MAX_DEGREE),
    );
    expect(bigHub).toBeLessThan(20);
  });
});

// --- ring placement --------------------------------------------------------

describe("ringCapacity", () => {
  it("is the largest count whose chord still clears the spacing", () => {
    for (const [radius, spacing] of [
      [32, 21.4],
      [90, 12],
      [500, 40],
    ] as const) {
      const n = ringCapacity(radius, spacing);
      expect(2 * radius * Math.sin(Math.PI / n)).toBeGreaterThanOrEqual(
        spacing,
      );
      if (n > 1) {
        // One more does not fit: the capacity is tight rather than merely safe.
        expect(2 * radius * Math.sin(Math.PI / (n + 1))).toBeLessThan(spacing);
      }
    }
  });

  it("gives a single slot rather than zero when nothing fits", () => {
    expect(ringCapacity(1, 100)).toBe(1);
    expect(ringCapacity(0, 10)).toBe(1);
  });
});

describe("leafSlots", () => {
  it("puts a small cluster on ONE uniform-radius ring at even angles", () => {
    const slots = leafSlots(6, 40, 20, 0.7);
    for (const s of slots) expect(s.radius).toBeCloseTo(40, 6);
    // Even angular intervals, all the way round.
    const angles = slots.map((s) => s.angle).sort((a, b) => a - b);
    for (let i = 1; i < angles.length; i += 1) {
      expect(angles[i] - angles[i - 1]).toBeCloseTo((2 * Math.PI) / 6, 6);
    }
    // And the phase actually rotates the cluster.
    const unphased = leafSlots(6, 40, 20, 0);
    expect(slots[0].angle).toBeCloseTo(unphased[0].angle + 0.7, 6);
  });

  it("never places two leaves closer than the spacing, at any count", () => {
    for (const count of [1, 2, 9, 10, 40, 150, 600]) {
      const spacing = 21.4;
      const slots = leafSlots(count, 32, spacing, 1.1);
      expect(slots).toHaveLength(count);
      for (let i = 0; i < slots.length; i += 1) {
        expect(slots[i].radius).toBeGreaterThanOrEqual(32);
        for (let j = i + 1; j < slots.length; j += 1) {
          const d = Math.hypot(
            slots[i].radius * Math.cos(slots[i].angle) -
              slots[j].radius * Math.cos(slots[j].angle),
            slots[i].radius * Math.sin(slots[i].angle) -
              slots[j].radius * Math.sin(slots[j].angle),
          );
          expect(d).toBeGreaterThanOrEqual(spacing - 1e-9);
        }
      }
    }
  });

  it("spills a huge cluster onto concentric rings rather than one huge hoop", () => {
    const rings = spillRings(150, 32, 21.4);
    expect(rings.reduce((n, r) => n + r.slots, 0)).toBe(150);
    expect(rings.length).toBeGreaterThan(1);
    for (let i = 1; i < rings.length; i += 1) {
      // One spacing apart radially, so adjacent rings keep the same floor, and
      // each ring holds no more than its chord constraint allows.
      expect(rings[i].radius - rings[i - 1].radius).toBeCloseTo(21.4, 6);
      expect(rings[i].slots).toBeLessThanOrEqual(
        ringCapacity(rings[i].radius, 21.4),
      );
    }
    // A single ring would have to be 511 units out for 150 leaves; the wheel
    // stays inside a third of that.
    const outermost = rings[rings.length - 1].radius;
    expect(outermost).toBeLessThan(200);
    expect(outermost).toBeLessThan(21.4 / (2 * Math.sin(Math.PI / 150)));
  });

  it("is empty for an empty cluster", () => {
    expect(leafSlots(0, 32, 20, 0)).toEqual([]);
  });
});

// --- cluster packing -------------------------------------------------------

describe("packClusters", () => {
  const discs = [
    { id: "t:a", radius: 180 },
    { id: "t:b", radius: 96 },
    { id: "t:c", radius: 96 },
    { id: "t:d", radius: 64 },
    { id: "t:e", radius: 32 },
    { id: "t:f", radius: 32 },
    { id: "t:g", radius: 20 },
  ];

  it("leaves every pair at least a gap clear of each other", () => {
    const placed = packClusters(discs, CLUSTER_GAP);
    expect(placed.map((p) => p.id).sort()).toEqual(
      discs.map((d) => d.id).sort(),
    );
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        expect(gap(placed[i], placed[j])).toBeGreaterThanOrEqual(
          CLUSTER_GAP - 1e-6,
        );
      }
    }
  });

  it("puts the largest disc at the centre, where a big hole exists", () => {
    const placed = packClusters(discs, CLUSTER_GAP);
    const biggest = placed.find((p) => p.id === "t:a")!;
    expect(biggest.x).toBe(0);
    expect(biggest.y).toBe(0);
  });

  it("is deterministic", () => {
    expect(packClusters(discs, CLUSTER_GAP)).toEqual(
      packClusters([...discs].reverse(), CLUSTER_GAP),
    );
  });
});

describe("compactClusters", () => {
  it("makes the cloud tighter and still never overlaps", () => {
    const packed = packClusters(
      [
        { id: "t:a", radius: 120 },
        { id: "t:b", radius: 90 },
        { id: "t:c", radius: 90 },
        { id: "t:d", radius: 60 },
        { id: "t:e", radius: 30 },
      ],
      CLUSTER_GAP,
    );
    const extent = (
      cs: ReadonlyArray<{ x: number; y: number; radius: number }>,
    ) => Math.max(...cs.map((c) => Math.hypot(c.x, c.y) + c.radius));
    const compacted = compactClusters(packed, CLUSTER_GAP);
    expect(extent(compacted)).toBeLessThan(extent(packed));
    for (let i = 0; i < compacted.length; i += 1) {
      for (let j = i + 1; j < compacted.length; j += 1) {
        expect(gap(compacted[i], compacted[j])).toBeGreaterThanOrEqual(
          CLUSTER_GAP - 1e-6,
        );
      }
    }
  });
});

// --- the whole layout ------------------------------------------------------

/** A synthetic bipartite graph: `sizes[i]` bookmarks under tag i, every
 *  bookmark carrying its own tag plus (every seventh) the next one, which is
 *  what puts a few leaves between two clusters. */
function fixture(sizes: number[]): {
  nodes: LayoutNodeInput[];
  links: { s: string; t: string }[];
} {
  const nodes: LayoutNodeInput[] = [];
  const links: { s: string; t: string }[] = [];
  sizes.forEach((size, i) => {
    nodes.push({ id: `t:${i}`, kind: "tag", label: `tag-${i}`, weight: size });
    for (let b = 0; b < size; b += 1) {
      const id = `b:${i}-${b}`;
      nodes.push({ id, kind: "bookmark", label: `bookmark ${i}-${b}` });
      links.push({ s: id, t: `t:${i}` });
      if (i + 1 < sizes.length && b % 7 === 0) {
        links.push({ s: id, t: `t:${i + 1}` });
      }
    }
  });
  return { nodes, links };
}

describe("layoutGraph", () => {
  const sizes = [40, 24, 16, 12, 8, 5, 3, 150];
  const { nodes, links } = fixture(sizes);

  it("places every node the API handed in", () => {
    const laid = layoutGraph({ nodes, links });
    expect(laid.nodes.map((n) => n.id).sort()).toEqual(
      nodes.map((n) => n.id).sort(),
    );
    for (const n of laid.nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
      expect(n.radius).toBeGreaterThan(0);
    }
  });

  it("never lets two nodes touch", () => {
    const laid = layoutGraph({ nodes, links });
    for (let i = 0; i < laid.nodes.length; i += 1) {
      for (let j = i + 1; j < laid.nodes.length; j += 1) {
        const d = gap(laid.nodes[i], laid.nodes[j]);
        // Not merely non-overlapping: the collide padding is left between them,
        // which is what makes a cluster read as separated rather than smeared.
        expect(d).toBeGreaterThanOrEqual(COLLIDE_PADDING - 1e-6);
      }
    }
  });

  it("fans a hub's leaves onto one uniform-radius ring at even angles", () => {
    const laid = layoutGraph({ nodes, links });
    const hub = laid.nodes.find((n) => n.id === "t:5")!; // 5 bookmarks: one ring
    const leaves = laid.nodes.filter(
      (n) => n.cluster === hub.id && n.id !== hub.id,
    );
    expect(leaves).toHaveLength(5);
    const radii = leaves.map((n) => Math.hypot(n.x - hub.x, n.y - hub.y));
    for (const r of radii) expect(r).toBeCloseTo(radii[0], 6);
    const angles = leaves
      .map((n) => Math.atan2(n.y - hub.y, n.x - hub.x))
      .sort((a, b) => a - b);
    for (let i = 1; i < angles.length; i += 1) {
      expect(angles[i] - angles[i - 1]).toBeCloseTo((2 * Math.PI) / 5, 6);
    }
  });

  it("keeps a hundred-plus-leaf hub a wheel rather than a huge hoop", () => {
    const laid = layoutGraph({ nodes, links });
    const cluster = laid.clusters.find((c) => c.id === "t:7")!;
    expect(cluster.leaves).toBeGreaterThanOrEqual(150);
    // One ring would need ~500 units; the concentric rings keep it under 200.
    expect(cluster.radius).toBeLessThan(200);
  });

  it("separates clusters with a clear gap and never overlaps them", () => {
    const laid = layoutGraph({ nodes, links });
    expect(laid.clusters.length).toBe(sizes.length);
    for (let i = 0; i < laid.clusters.length; i += 1) {
      for (let j = i + 1; j < laid.clusters.length; j += 1) {
        expect(gap(laid.clusters[i], laid.clusters[j])).toBeGreaterThanOrEqual(
          CLUSTER_GAP - 1e-6,
        );
      }
    }
    expect(laid.cloudRadius).toBeGreaterThan(0);
    for (const c of laid.clusters) {
      expect(Math.hypot(c.x, c.y) + c.radius).toBeLessThanOrEqual(
        laid.cloudRadius + 1e-9,
      );
    }
  });

  it("gives a hub a markedly larger disc than its own leaves", () => {
    const laid = layoutGraph({ nodes, links });
    const hub = laid.nodes.find((n) => n.id === "t:7")!;
    const leaves = laid.nodes.filter(
      (n) => n.cluster === hub.id && n.id !== hub.id,
    );
    expect(
      Math.min(...leaves.map((n) => hub.radius / n.radius)),
    ).toBeGreaterThanOrEqual(2);
  });

  it("colours a hub and its leaves together, and cycles the palette", () => {
    const laid = layoutGraph({ nodes, links });
    for (const n of laid.nodes) {
      if (n.cluster === null) continue;
      const hub = laid.nodes.find((h) => h.id === n.cluster)!;
      expect(n.group).toBe(hub.group);
      expect(GROUP_COLORS[n.group]).toBeDefined();
    }
    // Bigger clusters are given the earlier inks, and the palette repeats
    // rather than leaving most clusters neutral.
    const hubGroups = laid.clusters.map(
      (c) => laid.nodes.find((n) => n.id === c.id)!.group,
    );
    expect(hubGroups).toContain(0);
    expect(hubGroups.length).toBeGreaterThan(GROUP_COLORS.length);
    expect(hubGroups.sort((a, b) => a - b)).toEqual(
      hubGroups.map((_, i) => i % GROUP_COLORS.length).sort((a, b) => a - b),
    );
  });

  it("sends a bookmark to the cluster of the tag that claims the most", () => {
    const laid = layoutGraph({ nodes, links });
    // b:0-0 carries t:0 and t:1; t:0 has 40 bookmarks, t:1 has 24.
    const lone = laid.nodes.find((n) => n.id === "b:0-0")!;
    expect(lone.cluster).toBe("t:0");
    // ...and it is still a leaf of the ring it was placed on, not of the other.
    const hub = laid.nodes.find((n) => n.id === "t:0")!;
    const dist = Math.hypot(lone.x - hub.x, lone.y - hub.y);
    expect(dist).toBeGreaterThan(hub.radius);
    expect(dist).toBeLessThan(
      laid.clusters.find((c) => c.id === "t:0")!.radius,
    );
  });

  it("is deterministic across runs and across the input order", () => {
    const a = layoutGraph({ nodes, links });
    const b = layoutGraph({ nodes, links });
    expect(a.nodes).toEqual(b.nodes);
    const shuffled = layoutGraph({
      nodes: [...nodes].reverse(),
      links: [...links].reverse(),
    });
    const byId = new Map(shuffled.nodes.map((n) => [n.id, n]));
    for (const n of a.nodes) {
      expect(byId.get(n.id)!.x).toBeCloseTo(n.x, 12);
      expect(byId.get(n.id)!.y).toBeCloseTo(n.y, 12);
      expect(byId.get(n.id)!.radius).toBe(n.radius);
      expect(byId.get(n.id)!.group).toBe(n.group);
    }
  });

  it("is a pure function of the ids: two runs cannot scatter", () => {
    // The sim this replaced seeded with Math.random(), so the same data laid out
    // twice was two different pictures. The one free parameter is a hash.
    expect(hashUnit("t:0", "#ring")).toBe(hashUnit("t:0", "#ring"));
    expect(hashUnit("t:0", "#ring")).not.toBe(hashUnit("t:1", "#ring"));
  });
});

describe("peripheral nodes", () => {
  const nodes: LayoutNodeInput[] = [
    { id: "t:a", kind: "tag", label: "a", weight: 3 },
    { id: "t:z", kind: "tag", label: "z", weight: 0 },
    { id: "b:1", kind: "bookmark", label: "one" },
    { id: "b:2", kind: "bookmark", label: "two" },
    { id: "b:3", kind: "bookmark", label: "three" },
    { id: "b:4", kind: "bookmark", label: "four", tags: [] },
  ];
  const links = [
    { s: "b:1", t: "t:a" },
    { s: "b:2", t: "t:a" },
    { s: "b:3", t: "t:a" },
  ];

  it("puts a stray outside every cluster, on the periphery", () => {
    const laid = layoutGraph({ nodes, links });
    // b:4 carries no surviving tag and t:z has no bookmarks: both are strays.
    for (const id of ["b:4", "t:z"]) {
      const stray = laid.nodes.find((n) => n.id === id)!;
      expect(stray.cluster).toBeNull();
      expect(stray.group).toBe(-1);
      expect(Math.hypot(stray.x, stray.y)).toBeGreaterThan(laid.cloudRadius);
      for (const c of laid.clusters) {
        expect(Math.hypot(stray.x - c.x, stray.y - c.y)).toBeGreaterThan(
          c.radius,
        );
      }
    }
    // ...and they are still laid out without overlapping anything.
    for (let i = 0; i < laid.nodes.length; i += 1) {
      for (let j = i + 1; j < laid.nodes.length; j += 1) {
        expect(gap(laid.nodes[i], laid.nodes[j])).toBeGreaterThanOrEqual(
          COLLIDE_PADDING - 1e-6,
        );
      }
    }
  });

  it("passes the hub's clearance floor on to the innermost ring", () => {
    // A one-leaf cluster still has to clear its hub's disc.
    const laid = layoutGraph({
      nodes: [
        { id: "t:a", kind: "tag", label: "a" },
        { id: "b:1", kind: "bookmark", label: "one" },
      ],
      links: [{ s: "b:1", t: "t:a" }],
    });
    const hub = laid.nodes.find((n) => n.id === "t:a")!;
    const leaf = laid.nodes.find((n) => n.id === "b:1")!;
    const dist = Math.hypot(leaf.x - hub.x, leaf.y - hub.y);
    expect(dist).toBeGreaterThanOrEqual(
      hub.radius + leaf.radius + COLLIDE_PADDING,
    );
    // The floor is the hub's clearance, never less than the ring minimum.
    expect(dist).toBeGreaterThanOrEqual(RING_MIN - 1e-9);
  });
});

describe("inkFor", () => {
  it("maps a cluster index to the palette and anything else to neutral", () => {
    expect(inkFor(0)).toBe(GROUP_COLORS[0]);
    expect(inkFor(GROUP_COLORS.length - 1)).toBe(
      GROUP_COLORS[GROUP_COLORS.length - 1],
    );
    expect(inkFor(-1)).toBe(NEUTRAL_INK);
    expect(inkFor(GROUP_COLORS.length)).toBe(NEUTRAL_INK);
    expect(GROUP_COLORS.length).toBeLessThanOrEqual(8);
  });
});
