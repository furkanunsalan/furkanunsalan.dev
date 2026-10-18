import { describe, it, expect } from "vitest";
import {
  EDGE_DIM_ALPHA,
  EDGE_LIT_ALPHA,
  EDGE_REST_ALPHA,
  HOVER_DIM_ALPHA,
  blendAlpha,
  buildHoverHighlight,
  dimmingAfter,
  edgeIsLit,
  edgeKey,
  edgeShowsAccent,
  edgeTargetAlpha,
  highlightAlpha,
  nodeIsLit,
  nodeTargetAlpha,
} from "@/lib/graph/hover";

const links = [
  { source: "a", target: "b" },
  { source: "a", target: "c" },
  { source: "b", target: "c" }, // among neighbours, but does NOT touch a
  { source: "d", target: "e" }, // a separate component
];

describe("buildHoverHighlight", () => {
  it("returns null when nothing is hovered, which is the no-dim case", () => {
    expect(buildHoverHighlight(null, links)).toBeNull();
  });

  it("keeps the hovered node and its immediate neighbours", () => {
    const h = buildHoverHighlight("a", links);
    expect(h).not.toBeNull();
    expect([...h!.nodes].sort()).toEqual(["a", "b", "c"]);
    // The hovered node itself is carried explicitly: the renderer draws an
    // anchor ring on it, and "the member that is not a neighbour" is not a
    // question the membership sets can answer.
    expect(h!.id).toBe("a");
  });

  it("keeps the edges that touch the hovered node, and not the ones between neighbours", () => {
    // The b-c edge connects two lit nodes but does not touch the hovered node.
    // Dimming it is the deliberate reading: "the connections of this node"
    // means the edges it is an endpoint of, which is what a reader follows.
    const h = buildHoverHighlight("a", links);
    expect(h!.edges.has(edgeKey("a", "b"))).toBe(true);
    expect(h!.edges.has(edgeKey("a", "c"))).toBe(true);
    expect(h!.edges.has(edgeKey("b", "c"))).toBe(false);
    expect(h!.edges.has(edgeKey("d", "e"))).toBe(false);
  });

  it("handles an isolated node: it lights alone and lights no edge", () => {
    const h = buildHoverHighlight("z", links);
    expect([...h!.nodes]).toEqual(["z"]);
    expect(h!.edges.size).toBe(0);
  });
});

describe("lit predicates", () => {
  it("everything is lit when nothing is hovered", () => {
    expect(nodeIsLit(null, "anything")).toBe(true);
    expect(edgeIsLit(null, "a", "d")).toBe(true);
    expect(highlightAlpha(null, false)).toBe(1);
  });

  it("separates lit from dimmed once a node is hovered", () => {
    const h = buildHoverHighlight("a", links);
    expect(nodeIsLit(h, "a")).toBe(true);
    expect(nodeIsLit(h, "b")).toBe(true);
    expect(nodeIsLit(h, "d")).toBe(false);
    expect(edgeIsLit(h, "a", "b")).toBe(true);
    expect(edgeIsLit(h, "d", "e")).toBe(false);
    expect(highlightAlpha(h, true)).toBe(1);
    expect(highlightAlpha(h, false)).toBe(HOVER_DIM_ALPHA);
  });
});

describe("dimmingAfter", () => {
  it("carries the new highlight while one is active", () => {
    const h = buildHoverHighlight("a", links);
    expect(dimmingAfter(null, h, null)).toEqual({
      source: { hover: h, matches: null },
      target: 1,
    });
  });

  it("KEEPS the classification while the dim fades out", () => {
    // The retention rule: dropping the source on the same frame the highlight
    // ends would collapse every element to its resting alpha at once, which is
    // the snap the fade exists to remove. The renderer clears it at dim 0.
    const h = buildHoverHighlight("a", links);
    const active = { source: { hover: h, matches: null }, target: 1 as const };
    const released = dimmingAfter(active.source, null, null);
    expect(released.target).toBe(0);
    expect(released.source).toBe(active.source);
  });
});

describe("target alphas", () => {
  it("nothing highlighted means full nodes and resting edges", () => {
    expect(nodeTargetAlpha(null, "a")).toBe(1);
    expect(edgeTargetAlpha(null, "a", "b")).toBe(EDGE_REST_ALPHA);
    expect(edgeShowsAccent(null, "a", "b")).toBe(false);
  });

  it("a hover dims the nodes outside the neighbourhood", () => {
    const source = { hover: buildHoverHighlight("a", links), matches: null };
    expect(nodeTargetAlpha(source, "a")).toBe(1);
    expect(nodeTargetAlpha(source, "c")).toBe(1);
    expect(nodeTargetAlpha(source, "d")).toBe(HOVER_DIM_ALPHA);
  });

  it("lights only the hovered node's own edges, in the accent", () => {
    const source = { hover: buildHoverHighlight("a", links), matches: null };
    expect(edgeTargetAlpha(source, "a", "b")).toBe(EDGE_LIT_ALPHA);
    expect(edgeTargetAlpha(source, "b", "c")).toBe(EDGE_DIM_ALPHA);
    expect(edgeShowsAccent(source, "a", "b")).toBe(true);
    expect(edgeShowsAccent(source, "b", "c")).toBe(false);
  });

  it("a search takes precedence over a hover", () => {
    // The pointer must not overwrite what the user typed: the matching nodes
    // stay lit and the whole edge layer stays quiet, hovered or not.
    const source = {
      hover: buildHoverHighlight("d", links),
      matches: new Set(["a", "b"]),
    };
    expect(nodeTargetAlpha(source, "a")).toBe(1);
    expect(nodeTargetAlpha(source, "b")).toBe(1);
    expect(nodeTargetAlpha(source, "c")).toBe(HOVER_DIM_ALPHA);
    for (const [s, t] of [
      ["a", "b"],
      ["d", "e"],
    ] as const) {
      expect(edgeTargetAlpha(source, s, t)).toBe(EDGE_DIM_ALPHA);
      expect(edgeShowsAccent(source, s, t)).toBe(false);
    }
  });
});

describe("blendAlpha", () => {
  it("runs from the resting value to the classified one and lands", () => {
    expect(blendAlpha(1, HOVER_DIM_ALPHA, 0)).toBe(1);
    expect(blendAlpha(1, HOVER_DIM_ALPHA, 1)).toBe(HOVER_DIM_ALPHA);
    expect(blendAlpha(1, HOVER_DIM_ALPHA, 0.5)).toBeCloseTo(0.59, 6);
  });

  it("warms an edge up toward its lit alpha rather than switching", () => {
    expect(blendAlpha(EDGE_REST_ALPHA, EDGE_LIT_ALPHA, 0.5)).toBeCloseTo(
      0.33,
      6,
    );
  });
});
