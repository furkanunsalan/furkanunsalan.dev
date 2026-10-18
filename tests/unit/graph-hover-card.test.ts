import { describe, it, expect } from "vitest";
import {
  HOVER_CARD_IN_MS,
  HOVER_CARD_OUT_MS,
  HOVER_CARD_LIFT_PX,
  HOVER_CARD_SCALE_FROM,
  HOVER_DIM_IN_MS,
  HOVER_DIM_OUT_MS,
  advancePresence,
  hoverCardFrame,
} from "@/lib/graph/hoverCard";

describe("advancePresence", () => {
  it("lands exactly on the target rather than approaching it", () => {
    expect(
      advancePresence(0, 1, 9999, HOVER_CARD_IN_MS, HOVER_CARD_OUT_MS),
    ).toBe(1);
    expect(
      advancePresence(1, 0, 9999, HOVER_CARD_IN_MS, HOVER_CARD_OUT_MS),
    ).toBe(0);
  });

  it("is frame-rate independent: two halves land where one whole does", () => {
    const whole = advancePresence(0, 1, HOVER_CARD_IN_MS, 220, 160);
    const halves = advancePresence(
      advancePresence(0, 1, HOVER_CARD_IN_MS / 2, 220, 160),
      1,
      HOVER_CARD_IN_MS / 2,
      220,
      160,
    );
    expect(halves).toBeCloseTo(whole, 6);
  });

  it("leaves faster than it arrives", () => {
    // The decision, not the arithmetic: a dismissal should get out of the way.
    expect(HOVER_CARD_OUT_MS).toBeLessThan(HOVER_CARD_IN_MS);
    expect(HOVER_DIM_OUT_MS).toBeLessThanOrEqual(HOVER_DIM_IN_MS);
    expect(HOVER_CARD_IN_MS).toBeGreaterThanOrEqual(180);
    expect(HOVER_CARD_IN_MS).toBeLessThanOrEqual(260);
  });

  it("does nothing when it is already there", () => {
    expect(advancePresence(1, 1, 40, 220, 160)).toBe(1);
    expect(advancePresence(0, 0, 40, 220, 160)).toBe(0);
  });
});

describe("hoverCardFrame", () => {
  it("starts invisible, small and low", () => {
    const f = hoverCardFrame(0);
    expect(f.opacity).toBe(0);
    expect(f.scale).toBe(HOVER_CARD_SCALE_FROM);
    expect(f.lift).toBe(HOVER_CARD_LIFT_PX);
  });

  it("settles fully into place", () => {
    expect(hoverCardFrame(1)).toEqual({ opacity: 1, scale: 1, lift: 0 });
  });

  it("settles faster than it fades, which is the ease-out on the transform", () => {
    const half = hoverCardFrame(0.5);
    expect(half.opacity).toBe(0.5);
    // easeOutCubic(0.5) = 0.875, so the scale is three quarters of the way to
    // full when the opacity is only halfway.
    expect(half.scale).toBeCloseTo(
      HOVER_CARD_SCALE_FROM + (1 - HOVER_CARD_SCALE_FROM) * 0.875,
      6,
    );
    expect(half.lift).toBeCloseTo(HOVER_CARD_LIFT_PX * 0.125, 6);
  });

  it("clamps out-of-range progress", () => {
    expect(hoverCardFrame(-1)).toEqual(hoverCardFrame(0));
    expect(hoverCardFrame(2)).toEqual(hoverCardFrame(1));
  });
});
