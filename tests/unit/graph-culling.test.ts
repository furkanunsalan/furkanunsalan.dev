import { describe, it, expect } from "vitest";
import {
  isEdgeVisible,
  isNodeVisible,
  visibleBounds,
} from "@/lib/graph/culling";

describe("visibleBounds", () => {
  it("back-projects the screen box into graph space", () => {
    // screen = graph * 2 + 100, a 400x300 canvas: the screen box [0,400]x[0,300]
    // is graph [-50,150]x[-50,100].
    const b = visibleBounds({ x: 100, y: 100, k: 2 }, 400, 300);
    expect(b).toEqual({ minX: -50, minY: -50, maxX: 150, maxY: 100 });
  });

  it("grows the box by the margin on every side", () => {
    const b = visibleBounds({ x: 0, y: 0, k: 1 }, 100, 100, 10);
    expect(b).toEqual({ minX: -10, minY: -10, maxX: 110, maxY: 110 });
  });
});

describe("isNodeVisible", () => {
  const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

  it("keeps a centre inside and drops one outside", () => {
    expect(isNodeVisible({ x: 50, y: 50 }, bounds)).toBe(true);
    expect(isNodeVisible({ x: 101, y: 50 }, bounds)).toBe(false);
    expect(isNodeVisible({ x: 50, y: -1 }, bounds)).toBe(false);
  });

  it("keeps a centre exactly on the edge", () => {
    expect(isNodeVisible({ x: 0, y: 100 }, bounds)).toBe(true);
  });
});

describe("isEdgeVisible", () => {
  const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

  it("keeps an edge with either endpoint on screen", () => {
    expect(isEdgeVisible({ x: -50, y: 50 }, { x: 50, y: 50 }, bounds)).toBe(
      true,
    );
    expect(isEdgeVisible({ x: 50, y: 50 }, { x: 500, y: 50 }, bounds)).toBe(
      true,
    );
  });

  it("drops an edge with both endpoints far off screen", () => {
    // The accepted approximation: a long segment crossing the viewport between
    // two distant endpoints is culled rather than intersection-tested.
    expect(isEdgeVisible({ x: -500, y: 50 }, { x: 500, y: 50 }, bounds)).toBe(
      false,
    );
  });
});
