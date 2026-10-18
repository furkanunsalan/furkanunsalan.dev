import { describe, it, expect } from "vitest";
import {
  DRAG_THRESHOLD_PX,
  classifyRelease,
  crossedDragThreshold,
} from "@/lib/graph/pointer";

describe("crossedDragThreshold", () => {
  it("keeps a press that barely moved a click", () => {
    expect(crossedDragThreshold(0, 0)).toBe(false);
    expect(crossedDragThreshold(1, 1)).toBe(false);
    expect(crossedDragThreshold(DRAG_THRESHOLD_PX, 0)).toBe(false);
  });

  it("calls movement past the threshold a drag", () => {
    expect(crossedDragThreshold(DRAG_THRESHOLD_PX + 1, 0)).toBe(true);
    expect(crossedDragThreshold(0, -(DRAG_THRESHOLD_PX + 1))).toBe(true);
  });

  it("sums the axes rather than measuring the hypotenuse", () => {
    // The reference's rule, kept: a (3,2) nudge is 5 — over the threshold —
    // even though its hypotenuse (3.6) is not.
    expect(crossedDragThreshold(3, 2)).toBe(true);
    expect(Math.hypot(3, 2)).toBeLessThan(DRAG_THRESHOLD_PX);
  });
});

describe("classifyRelease", () => {
  it("a press on empty space that did not move is a background tap", () => {
    expect(classifyRelease(null, false)).toEqual({ kind: "background-tap" });
  });

  it("a press on a node that did not move is a click, and carries its id", () => {
    expect(classifyRelease("b:abc", false)).toEqual({
      kind: "node-click",
      id: "b:abc",
    });
  });

  it("anything that moved is a pan, so a drag never opens a bookmark", () => {
    // The whole feature in one assertion: a press that became a drag must not
    // reach the URL-opening path, whatever it landed on.
    expect(classifyRelease(null, true)).toEqual({ kind: "pan" });
    expect(classifyRelease("b:abc", true)).toEqual({ kind: "pan" });
  });
});
