import { describe, expect, it } from "vitest";
import {
  coastCellAspect,
  coastColorIndices,
  coastCols,
  coastGlow,
  coastGlyphs,
  coastIndexAlphabet,
  coastNoise,
  coastPalette,
  coastRows,
} from "@/data/coastFooter";

// The luminance ramp the art was quantised through, given in the component's
// provenance notes. Written out as an array because the ramp itself contains
// both quote characters and a backtick.
const RAMP = [
  " ",
  ".",
  "'",
  "`",
  "^",
  '"',
  ",",
  ":",
  ";",
  "I",
  "l",
  "!",
  "i",
  ">",
  "<",
  "~",
  "+",
  "_",
  "-",
  "?",
  "]",
  "[",
  "}",
  "{",
  "1",
  ")",
  "(",
  "|",
  "/",
  "t",
  "f",
  "j",
  "r",
  "x",
  "n",
  "u",
  "v",
  "c",
  "z",
  "X",
  "Y",
  "U",
  "J",
  "C",
  "L",
  "Q",
  "0",
  "O",
  "Z",
  "m",
  "w",
  "q",
  "p",
  "d",
  "b",
  "k",
  "h",
  "a",
  "o",
  "*",
  "#",
  "M",
  "W",
  "&",
  "8",
  "%",
  "B",
  "@",
  "$",
].join("");

describe("coast footer data", () => {
  it("is a 201x34 grid in both layers", () => {
    expect(coastCols).toBe(201);
    expect(coastRows).toBe(34);
    expect(coastGlyphs).toHaveLength(coastRows);
    expect(coastColorIndices).toHaveLength(coastRows);
    for (const row of coastGlyphs) expect(row).toHaveLength(coastCols);
    for (const row of coastColorIndices) expect(row).toHaveLength(coastCols);
  });

  it("quantises every glyph through the luminance ramp", () => {
    const allowed = new Set(RAMP);
    const seen = new Set<string>();
    for (const row of coastGlyphs) {
      for (const ch of row) {
        seen.add(ch);
        expect(allowed.has(ch), `unexpected glyph ${JSON.stringify(ch)}`).toBe(
          true,
        );
      }
    }
    // A ramp this size should actually be used, not just tolerated.
    expect(seen.size).toBeGreaterThan(20);
  });

  it("indexes every cell into the palette", () => {
    expect(coastPalette).toHaveLength(64);
    expect(coastIndexAlphabet).toHaveLength(64);
    const allowed = new Set(coastIndexAlphabet);
    for (const row of coastColorIndices) {
      for (const ch of row) {
        expect(allowed.has(ch), `bad index ${JSON.stringify(ch)}`).toBe(true);
        expect(coastIndexAlphabet.indexOf(ch)).toBeLessThan(
          coastPalette.length,
        );
      }
    }
  });

  it("keeps the palette entries as hex colours", () => {
    for (const colour of coastPalette) {
      expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("describes a bloom that fits inside the art", () => {
    for (const v of [coastGlow.cx, coastGlow.cy, coastGlow.radius]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(coastGlow.strength).toBeGreaterThan(0);
    expect(coastGlow.strength).toBeLessThanOrEqual(1);
    expect(coastGlow.falloff).toBeGreaterThan(0);
  });

  it("uses printable ASCII for the decode noise", () => {
    expect(coastNoise.length).toBeGreaterThan(8);
    for (const ch of coastNoise) {
      const code = ch.charCodeAt(0);
      expect(code).toBeGreaterThanOrEqual(0x20);
      expect(code).toBeLessThanOrEqual(0x7e);
    }
  });

  it("keeps the cell aspect at 2 so the box matches the em grid", () => {
    // 201 cells x 0.6em across, 34 rows x 1.2em down — the aspect-ratio the
    // component reserves, which is why the box exists before hydration.
    expect(coastCellAspect).toBe(2);
    const emAspect = (coastCols * 0.6) / (coastRows * 1.2);
    expect(Math.abs(emAspect - 1206 / 408)).toBeLessThan(0.001);
  });
});
