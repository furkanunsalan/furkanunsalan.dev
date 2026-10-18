import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The reduced-motion gate has to live in JAVASCRIPT (myne-md/myne#727).
//
// This is asserted against the island's SOURCE, in the same style as the
// reference's own test: a CSS media query provably cannot reach a canvas, which
// is drawn by script, so the global `prefers-reduced-motion` rule that zeroes
// animations does not cover the camera tween, the dim or the hover card. A
// runtime test cannot see the difference without a display, so the guarantee
// worth pinning is that the decision exists somewhere specific.

const source = readFileSync(
  join(process.cwd(), "components/BookmarkGraph.tsx"),
  "utf8",
);

describe("the reduced-motion gate lives in JavaScript", () => {
  it("the renderer consults prefers-reduced-motion itself", () => {
    expect(source).toContain("(prefers-reduced-motion: reduce)");
  });

  it("and it listens for a change, so toggling the OS setting takes effect", () => {
    expect(source).toMatch(/reduceMotion\?\.addEventListener\?\.\("change"/);
    expect(source).toMatch(/reduceMotion\?\.removeEventListener\?\.\("change"/);
  });

  it("the camera snap path assigns the transform instead of tweening to it", () => {
    // The gate is only real if it SHORT-CIRCUITS: a gate that still started the
    // tween would animate regardless, and the assertion above would still pass.
    expect(source).toMatch(/s\.reduce[\s\S]{0,200}s\.view = to/);
  });

  it("the dim and the hover card are gated too, not just the camera", () => {
    expect(source).toMatch(/s\.reduce[\s\S]{0,80}s\.dimTarget/);
    expect(source).toMatch(/s\.reduce[\s\S]{0,80}s\.cardTarget/);
  });
});
