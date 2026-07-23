import { describe, it, expect } from "vitest";
import { cleanLinks, cleanStringArray } from "@/lib/validators";

describe("cleanLinks", () => {
  it("keeps only entries with a non-empty url and coerces label", () => {
    expect(
      cleanLinks([
        { url: "https://a.com", label: "A" },
        { url: "", label: "empty" },
        { label: "no url" },
        { url: "https://b.com" },
        "garbage",
        null,
      ]),
    ).toEqual([
      { label: "A", url: "https://a.com" },
      { label: "", url: "https://b.com" },
    ]);
  });
  it("returns [] for non-arrays", () => {
    expect(cleanLinks("nope")).toEqual([]);
    expect(cleanLinks(undefined)).toEqual([]);
  });
});

describe("cleanStringArray", () => {
  it("keeps only non-empty strings", () => {
    expect(cleanStringArray(["a", "", "b", 1, null, "c"])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
  it("returns [] for non-arrays", () => {
    expect(cleanStringArray(42)).toEqual([]);
  });
});
