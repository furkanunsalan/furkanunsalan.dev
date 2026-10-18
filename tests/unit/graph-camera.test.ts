import { describe, it, expect } from "vitest";
import {
  CAMERA_TWEEN_MS,
  K_MAX,
  K_MIN,
  clampK,
  easeOutCubic,
  fitTransform,
  tweenTransform,
} from "@/lib/graph/camera";

describe("easeOutCubic", () => {
  it("pins both ends and clamps outside the range", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(-5)).toBe(0);
    expect(easeOutCubic(5)).toBe(1);
  });

  it("is past halfway at half time, which is what makes it an ease-OUT", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe("tweenTransform", () => {
  const from = { x: 0, y: 0, k: 1 };
  const to = { x: 200, y: -100, k: 4 };

  it("starts at the source and lands exactly on the target", () => {
    expect(tweenTransform(from, to, 0)).toEqual(from);
    expect(tweenTransform(from, to, 1)).toEqual(to);
  });

  it("interpolates zoom GEOMETRICALLY, so the perceived rate is even", () => {
    // The decision this pins: zoom is a ratio, not a distance. At the eased
    // midpoint the geometric answer is 4 ** easeOutCubic(0.5); a linear ramp
    // would be at 1 + 3 * easeOutCubic(0.5), and the eye reads that difference
    // as the zoom slowing down as it arrives.
    const eased = easeOutCubic(0.5);
    const mid = tweenTransform({ x: 0, y: 0, k: 1 }, { x: 0, y: 0, k: 4 }, 0.5);
    expect(mid.k).toBeCloseTo(4 ** eased, 6);
    expect(mid.k).not.toBeCloseTo(1 + 3 * eased, 3);
  });

  it("interpolates pan linearly, so it tracks the target without overshoot", () => {
    const mid = tweenTransform(from, { x: 100, y: 100, k: 1 }, 0.5);
    // easeOutCubic(0.5) = 0.875, so a linear pan is seven eighths of the way.
    expect(mid.x).toBeCloseTo(87.5, 6);
    expect(mid.y).toBeCloseTo(87.5, 6);
  });

  it("never overshoots the target on any step", () => {
    for (let i = 0; i <= 10; i += 1) {
      const p = tweenTransform(from, to, i / 10);
      expect(p.k).toBeGreaterThanOrEqual(1);
      expect(p.k).toBeLessThanOrEqual(4);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(200);
    }
  });

  it("the duration is in the band the design system uses for a noticed move", () => {
    expect(CAMERA_TWEEN_MS).toBeGreaterThanOrEqual(250);
    expect(CAMERA_TWEEN_MS).toBeLessThanOrEqual(350);
  });
});

describe("clampK", () => {
  it("holds the wheel in its range", () => {
    expect(clampK(0.001)).toBe(K_MIN);
    expect(clampK(99)).toBe(K_MAX);
    expect(clampK(1.7)).toBe(1.7);
  });
});

describe("fitTransform", () => {
  it("returns the identity for an empty cloud", () => {
    expect(fitTransform([], 800, 600)).toEqual({ x: 0, y: 0, k: 1 });
  });

  it("centres a symmetric cloud", () => {
    const fit = fitTransform(
      [
        { x: -50, y: -50 },
        { x: 50, y: 50 },
        { x: -50, y: 50 },
        { x: 50, y: -50 },
      ],
      800,
      600,
    );
    expect(fit.x).toBeCloseTo(400, 6);
    expect(fit.y).toBeCloseTo(300, 6);
  });

  it("caps the zoom so a two-node graph does not fill the screen", () => {
    const fit = fitTransform(
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      800,
      600,
    );
    expect(fit.k).toBe(1.5);
  });

  it("trims a distant outlier instead of framing the whole outlier cloud", () => {
    // 200 clustered points plus one escaped node far away. Without the 3% trim
    // the bounding box would be the outlier's, and the fit would clamp to its
    // 0.4 floor — a dot in the middle of an empty screen.
    const cluster = [];
    for (let i = 0; i < 200; i += 1) {
      cluster.push({ x: -1 + (i % 20) / 10, y: -1 + Math.floor(i / 20) / 10 });
    }
    const withOutlier = fitTransform(
      [{ x: 1e5, y: 1e5 }, ...cluster],
      800,
      600,
    );
    const without = fitTransform(cluster, 800, 600);
    expect(withOutlier.k).toBe(1.5);
    expect(withOutlier.k).toBe(without.k);
    expect(withOutlier.x).toBeCloseTo(without.x, 6);
  });
});
