import { describe, it, expect } from "vitest";
import { slugify, slugifyAscii, cleanUserSlug } from "@/lib/slugify";

describe("slugifyAscii", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyAscii("Hello World")).toBe("hello-world");
  });
  it("strips diacritics and punctuation", () => {
    expect(slugifyAscii("Café déjà vu!")).toBe("cafe-deja-vu");
  });
  it("uses the fallback for empty input", () => {
    expect(slugifyAscii("")).toBe("item");
    expect(slugifyAscii("!!!", "fb")).toBe("fb");
  });
  it("caps length at 80 chars", () => {
    expect(slugifyAscii("a".repeat(200)).length).toBe(80);
  });
});

describe("slugify (Turkish-aware)", () => {
  it("maps Turkish characters", () => {
    expect(slugify("Merhaba Dünya")).toBe("merhaba-dunya");
    expect(slugify("İçğöşü")).toBe("icgosu");
  });
});

describe("cleanUserSlug", () => {
  it("sanitises traversal / unsafe input to a safe slug", () => {
    expect(cleanUserSlug("../etc")).toBe("etc");
    expect(cleanUserSlug("My Post/../x")).toBe("my-post-x");
  });
  it("returns null when nothing survives", () => {
    expect(cleanUserSlug("")).toBeNull();
    expect(cleanUserSlug("!!!")).toBeNull();
    expect(cleanUserSlug(null)).toBeNull();
  });
});
