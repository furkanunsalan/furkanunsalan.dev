import { describe, it, expect } from "vitest";
import {
  renderBody,
  renderMarkdownHtml,
  extractHeadings,
} from "@/lib/markdoc-render";
import { slugifyHeading } from "@/lib/headings";

const htmlOf = (content: string) =>
  renderBody(content)
    .segments.filter((s) => s.kind === "html")
    .map((s) => (s as { html: string }).html)
    .join("");

describe("renderBody", () => {
  it("puts the article text in an html segment (not an island)", () => {
    const { segments } = renderBody(
      "# Title\n\nHello **world** from the server.\n",
    );
    const html = segments
      .filter((s) => s.kind === "html")
      .map((s) => (s as any).html)
      .join("");
    expect(html).toContain("Hello");
    expect(html).toContain("<strong>world</strong>");
    expect(segments.every((s) => s.kind === "html")).toBe(true);
  });

  it("renders headings with deduped slug ids matching the TOC", () => {
    const { segments, headings } = renderBody(
      "## Setup\n\ntext\n\n## Setup\n\nmore\n",
    );
    expect(headings.map((h) => h.id)).toEqual(["setup", "setup-1"]);
    const html = segments.map((s) => (s as any).html ?? "").join("");
    expect(html).toContain('id="setup"');
    expect(html).toContain('id="setup-1"');
  });

  it("splits mermaid fences out as a mermaid segment", () => {
    const { segments } = renderBody(
      "before\n\n```mermaid\ngraph TD; A-->B;\n```\n\nafter\n",
    );
    const kinds = segments.map((s) => s.kind);
    expect(kinds).toContain("mermaid");
    const mermaid = segments.find((s) => s.kind === "mermaid") as any;
    expect(mermaid.chart).toContain("graph TD");
    // the fence must NOT leak into the html as a literal <Mermaid> element
    expect(htmlOf("```mermaid\ngraph TD;\n```")).not.toContain("<Mermaid");
  });

  it("keeps non-mermaid fences as <pre data-language>", () => {
    const html = htmlOf("```js\nconst x = 1;\n```\n");
    expect(html).toContain('data-language="js"');
    expect(html).toContain("<pre");
  });

  it("collapses consecutive image-only paragraphs into one bento segment", () => {
    const { segments } = renderBody(
      "![one](/api/img/thoughts/a.jpg)\n\n![two](/api/img/thoughts/b.jpg)\n\npara\n",
    );
    const bento = segments.find((s) => s.kind === "bento") as any;
    expect(bento).toBeTruthy();
    expect(bento.images).toEqual([
      { src: "/api/img/thoughts/a.jpg", alt: "one" },
      { src: "/api/img/thoughts/b.jpg", alt: "two" },
    ]);
    expect(segments.filter((s) => s.kind === "bento")).toHaveLength(1);
  });

  it("segments a mermaid fence nested inside a list without breaking the wrapper", () => {
    const { segments } = renderBody(
      "- item\n\n  ```mermaid\n  graph TD;\n  ```\n",
    );
    const kinds = segments.map((s) => s.kind);
    expect(kinds).toContain("mermaid");
    const html = segments
      .filter((s) => s.kind === "html")
      .map((s) => (s as any).html)
      .join("");
    expect(html).toContain("<li>");
    expect(html).toContain("</li>");
    expect(html).not.toContain("<Mermaid");
    expect(html).not.toContain("PostBentoImages");
  });
});

describe("heading ids", () => {
  // Global search deep-links to these anchors, so the body render must use the
  // same slug rule as lib/headings.ts — a local copy could drift silently.
  it("uses the shared slugifyHeading rule", () => {
    expect(slugifyHeading("Merhaba Dünya!")).toBe("merhaba-dunya");
    const { headings } = renderBody("## Merhaba Dünya!\n\ntext\n");
    expect(headings[0].id).toBe(slugifyHeading("Merhaba Dünya!"));
  });
});

describe("extractHeadings", () => {
  it("walks nested nodes", () => {
    const headings = extractHeadings({
      type: "root",
      children: [
        {
          type: "heading",
          attributes: { level: 2 },
          children: [{ type: "text", attributes: { content: "Deep" } }],
        },
      ],
    });
    expect(headings).toEqual([{ id: "deep", text: "Deep", level: 2 }]);
  });
});

describe("renderMarkdownHtml", () => {
  it("renders thought bodies to html", () => {
    expect(renderMarkdownHtml("hello *there*")).toContain("<em>there</em>");
  });
  it("returns empty for blank input", () => {
    expect(renderMarkdownHtml("   ")).toBe("");
  });
});
