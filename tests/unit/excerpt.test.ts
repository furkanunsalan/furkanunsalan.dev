import { describe, it, expect } from "vitest";
import { excerptFromMarkdoc } from "@/lib/excerpt";

describe("excerptFromMarkdoc", () => {
  it("strips markdown decoration and code, keeps link labels", () => {
    const md =
      "# Title\n\nSome **bold** text with `code` and a [link](https://x.com).";
    expect(excerptFromMarkdoc(md)).toBe(
      "Title Some bold text with and a link.",
    );
  });

  it("drops fenced code blocks and images", () => {
    const md = "Intro para.\n\n```js\nconst x = 1;\n```\n\n![alt](img.png) end";
    const out = excerptFromMarkdoc(md);
    expect(out).not.toContain("const");
    expect(out).not.toContain("img.png");
    expect(out).toContain("Intro para");
  });

  it("truncates to maxWords with an ellipsis", () => {
    const md = "one two three four five six";
    expect(excerptFromMarkdoc(md, 3)).toBe("one two three…");
  });

  it("does not add an ellipsis when under the limit", () => {
    expect(excerptFromMarkdoc("short one", 32)).toBe("short one");
  });
});
