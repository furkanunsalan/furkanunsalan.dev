import { describe, expect, it } from "vitest";
import {
  LABEL_FADE_FROM,
  LABEL_FADE_MIN,
  LABEL_FADE_TO,
  labelFade,
} from "@/lib/graph/labels";

// Labels belong to a zoom level: the whole-cloud framing has no room for 66 of
// them, and a node's neighbourhood at close range has nothing else to identify
// it by.
describe("labelFade", () => {
  const kFit = 0.7;

  it("shows labels in full at the fitted framing and above", () => {
    expect(labelFade(kFit, kFit)).toBe(1);
    expect(labelFade(kFit * 1.5, kFit)).toBe(1);
    expect(labelFade(4, kFit)).toBe(1);
  });

  it("hides them completely once the view is pulled well back", () => {
    expect(labelFade(kFit * LABEL_FADE_TO, kFit)).toBe(0);
    expect(labelFade(kFit * 0.3, kFit)).toBe(0);
    expect(labelFade(0.15, kFit)).toBe(0);
  });

  it("fades monotonically between the two ends", () => {
    let prev = -1;
    for (let rel = LABEL_FADE_TO; rel <= LABEL_FADE_FROM; rel += 0.01) {
      const v = labelFade(kFit * rel, kFit);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    // The loop's last step lands a float-hair under the top of the band, so it
    // is near-1 there rather than exactly 1; the endpoint itself is exact.
    expect(prev).toBeGreaterThan(0.99);
    expect(labelFade(kFit * LABEL_FADE_FROM, kFit)).toBe(1);
  });

  it("is smoothstepped, so it neither pops on nor lingers", () => {
    // Halfway through the band a linear ramp would be at 0.5; a smoothstep is
    // also 0.5 there, but its ends are flatter — check the quarter points.
    const quarter = labelFade(
      kFit * (LABEL_FADE_TO + (LABEL_FADE_FROM - LABEL_FADE_TO) * 0.25),
      kFit,
    );
    expect(quarter).toBeLessThan(0.25);
    const threeQuarters = labelFade(
      kFit * (LABEL_FADE_TO + (LABEL_FADE_FROM - LABEL_FADE_TO) * 0.75),
      kFit,
    );
    expect(threeQuarters).toBeGreaterThan(0.75);
  });

  it("keys off the fitted zoom, so a small window still shows labels", () => {
    // The fit varies with the viewport (0.4 on a short window, 1.5 on a large
    // one). Keyed to the fit, both framings show labels in full.
    expect(labelFade(0.4, 0.4)).toBe(1);
    expect(labelFade(1.5, 1.5)).toBe(1);
    // An absolute threshold would have failed the 0.4 case outright.
    expect(labelFade(0.4, 1.5)).toBe(0);
  });

  it("degrades to visible rather than invisible on nonsense input", () => {
    expect(labelFade(1, 0)).toBe(1);
    expect(labelFade(Number.NaN, 1)).toBe(1);
  });

  it("keeps the skip threshold below the band it skips", () => {
    expect(LABEL_FADE_MIN).toBeLessThan(0.1);
  });
});
