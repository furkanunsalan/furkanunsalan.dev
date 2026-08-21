import { describe, expect, it } from "vitest";
import {
  anyQueryText,
  makeSnippet,
  parseQuery,
  relatedQueryText,
} from "@/lib/search-query";
import { slugifyHeading, splitSections } from "@/lib/headings";

describe("parseQuery", () => {
  it("treats a trailing word as a prefix while it's being typed", () => {
    const p = parseQuery("postgres sea");
    expect(p.base).toBe("postgres");
    expect(p.prefix).toBe("sea:*");
  });

  it("treats the last word as complete once a space follows it", () => {
    const p = parseQuery("postgres sea ");
    expect(p.base).toBe("postgres sea");
    expect(p.prefix).toBe("");
  });

  it("keeps quoted phrases and exclusions in the websearch base", () => {
    const p = parseQuery('"full text" -mysql ');
    expect(p.base).toBe('"full text" -mysql');
    expect(p.prefix).toBe("");
  });

  it("does not prefix-match a closing quote", () => {
    const p = parseQuery('"full text"');
    expect(p.prefix).toBe("");
    expect(p.base).toBe('"full text"');
  });

  it("strips tsquery operators out of the prefix lexeme", () => {
    expect(parseQuery("what & (why").prefix).toBe("why:*");
  });

  it("drops boolean operators and short noise from highlight terms", () => {
    expect(parseQuery("astro or a ").terms).toEqual(["astro"]);
  });

  it("returns nothing to query for blank input", () => {
    const p = parseQuery("   ");
    expect(p.base).toBe("");
    expect(p.prefix).toBe("");
  });
});

describe("splitSections", () => {
  it("numbers duplicate heading slugs the way PostBody does", () => {
    const s = splitSections("# Setup\na\n\n# Setup\nb");
    expect(s.map((x) => x.id)).toEqual(["setup", "setup-1"]);
  });

  it("ignores hashes inside fenced code", () => {
    const s = splitSections("# Real\n```\n# not a heading\n```\n");
    expect(s.map((x) => x.id)).toEqual(["real"]);
  });

  it("keeps lead text before the first heading anchorless", () => {
    const s = splitSections("intro prose\n\n# One\nbody");
    expect(s[0].id).toBeNull();
    expect(s[1].id).toBe("one");
  });
});

describe("makeSnippet", () => {
  const body = [
    "# Intro",
    "Nothing to see here.",
    "",
    "## Deploying the container",
    "We ship a distroless image and health-check it after the rollout.",
  ].join("\n");

  it("anchors the snippet to the heading the match sits under", () => {
    const { snippet, anchor } = makeSnippet(body, ["distroless"]);
    expect(anchor).toBe("deploying-the-container");
    expect(snippet).toContain("distroless");
  });

  it("falls back to the lead prose when only the title matched", () => {
    const { snippet, anchor } = makeSnippet(body, ["zzzz"]);
    expect(anchor).toBeNull();
    expect(snippet).toContain("Nothing to see here");
  });

  it("strips markdoc tags and code fences out of the snippet", () => {
    const src = "{% callout %}\n```js\nconst x = 1;\n```\nreal prose here";
    expect(makeSnippet(src, ["real"]).snippet).toBe("real prose here");
  });

  it("windows long bodies around the hit", () => {
    const long = `${"filler ".repeat(200)}needle ${"tail ".repeat(200)}`;
    const { snippet } = makeSnippet(long, ["needle"]);
    expect(snippet).toContain("needle");
    expect(snippet.length).toBeLessThan(230);
    expect(snippet.startsWith("…")).toBe(true);
  });
});

describe("slugifyHeading", () => {
  it("folds diacritics and punctuation", () => {
    expect(slugifyHeading("Café — Notes!")).toBe("cafe-notes");
  });
});

describe("relatedQueryText", () => {
  it("turns a multi-word tag into an adjacency phrase, not OR-ed halves", () => {
    expect(relatedQueryText("", ["self-hosting"])).toBe("(self <-> hosting)");
    expect(relatedQueryText("", ["Self Hosting"])).toBe("(self <-> hosting)");
  });

  it("does not let a generic half of a compound tag match on its own", () => {
    const q = relatedQueryText("", ["self-hosting"]);
    expect(q.split(" | ")).not.toContain("self");
  });

  it("combines tags and title words without duplicates", () => {
    const q = relatedQueryText("Homelab notes", ["homelab", "ops"]);
    expect(q.split(" | ").sort()).toEqual(["homelab", "notes", "ops"]);
  });

  it("drops one- and two-letter fragments", () => {
    expect(relatedQueryText("A of it", [])).toBe("");
  });

  it("is empty when there is nothing indexable", () => {
    expect(relatedQueryText("", [])).toBe("");
  });

  it("ignores language tags, which describe form not subject", () => {
    expect(relatedQueryText("", ["English", "Türkçe"])).toBe("");
    expect(relatedQueryText("", ["homelab", "English"])).toBe("homelab");
  });
});

describe("anyQueryText", () => {
  it("ORs the words so one typo can't zero out the query", () => {
    expect(anyQueryText(["self", "hostng", "vps"])).toBe("self | hostng | vps");
  });

  it("is empty when nothing survives", () => {
    expect(anyQueryText(["a", "of"])).toBe("");
  });
});
