// Markdoc's published CJS entry (dist/index.js) is loaded raw at runtime — it's
// listed in astro.config's ssr.external — and Node's ESM loader can't see its
// named exports, so `import Markdoc, { Tag }` throws "does not provide an export
// named 'Tag'". Every member is reached through the default export instead
// (same pattern as lib/content.ts). Types are erased, so they can be named.
import Markdoc from "@markdoc/markdoc";
import type { Config, Schema, Tag } from "@markdoc/markdoc";
// The heading-slug rule lives in lib/headings.ts: global search deep-links a
// body match to a section anchor, so the ids rendered here and the ids search
// computes must come from the same function.
import { slugifyHeading } from "@/lib/headings";

export type Heading = { id: string; text: string; level: number };

// Body content reduced to a flat, ordered list of renderable segments. The
// interactive pieces (Mermaid diagrams, image bento grids) stay as React
// islands mounted by MarkdocBody.astro; everything else is a plain HTML string
// rendered by Markdoc's HTML renderer, so the article text is in the SSR HTML
// instead of arriving after ~270 KB of client JS has parsed it.
export type BodySegment =
  | { kind: "html"; html: string }
  | { kind: "mermaid"; chart: string }
  | { kind: "bento"; images: { src: string; alt: string }[] };

type RenderableNode = Tag | string | null | undefined;

const { Tag: TagClass, renderers } = Markdoc;
const htmlRenderer = renderers.html;

export function nodeText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(nodeText).join(" ");
  if (node.type === "text") return String(node.attributes?.content ?? "");
  return nodeText(node.children);
}

export function extractHeadings(node: any): Heading[] {
  const items: Heading[] = [];
  const seen = new Map<string, number>();
  const walk = (n: any) => {
    if (!n) return;
    if (n.type === "heading") {
      const text = nodeText(n).trim();
      const level = (n.attributes?.level as number) || 1;
      let id = slugifyHeading(text);
      const count = seen.get(id) || 0;
      seen.set(id, count + 1);
      if (count > 0) id = `${id}-${count}`;
      items.push({ id, text, level });
    }
    (n.children || []).forEach(walk);
  };
  walk(node);
  return items;
}

// Build a fresh Markdoc config per render so heading ids dedup deterministically
// using the same slug+counter logic as extractHeadings (both via lib/headings).
export function buildMarkdocConfig(): Config {
  const seen = new Map<string, number>();
  const heading: Schema = {
    children: ["inline"],
    attributes: {
      id: { type: String },
      level: { type: Number, required: true, default: 1 },
    },
    transform(node, config) {
      const attributes = node.transformAttributes(config);
      const children = node.transformChildren(config);
      const text = nodeText(node).trim();
      const base = slugifyHeading(text);
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      const id = attributes.id || (count > 0 ? `${base}-${count}` : base);
      return new TagClass(
        `h${attributes.level}`,
        { ...attributes, id },
        children,
      );
    },
  };
  // Image-only paragraphs become a marker Tag we can later collapse into a
  // bento grid across consecutive paragraphs. A paragraph counts as image-only
  // when all of its meaningful inline children are images (whitespace is fine).
  const paragraph: Schema = {
    children: ["inline"],
    transform(node, config) {
      const children = node.transformChildren(config);
      const meaningful = children.filter(
        (c) => !(typeof c === "string" && c.trim() === ""),
      );
      const allImages =
        meaningful.length > 0 &&
        meaningful.every(
          (c) => typeof c === "object" && (c as Tag).name === "img",
        );
      if (allImages) {
        return new TagClass("PostImageRun", {}, meaningful as (Tag | string)[]);
      }
      return new TagClass("p", {}, children);
    },
  };
  // Fenced code: ```mermaid becomes a Mermaid segment; every other language
  // keeps Markdoc's default <pre data-language> output unchanged.
  const fence: Schema = {
    attributes: {
      content: { type: String, render: false, required: true },
      language: { type: String, render: "data-language" },
      process: { type: Boolean, render: false, default: true },
    },
    transform(node, config) {
      const content = String(node.attributes.content ?? "");
      if ((node.attributes.language as string) === "mermaid") {
        return new TagClass("Mermaid", { chart: content });
      }
      const children = node.children.length
        ? node.transformChildren(config)
        : [content];
      return new TagClass(
        "pre",
        { "data-language": node.attributes.language },
        children,
      );
    },
  };
  return { nodes: { heading, paragraph, fence } };
}

// Merge runs of consecutive PostImageRun tags into a single PostBentoImages
// tag at the document level. This lets the user split images across separate
// paragraphs and still get one bento group.
export function collapseImageRuns(node: RenderableNode): RenderableNode {
  if (typeof node === "string" || !node || typeof node !== "object")
    return node;
  const tag = node as Tag;
  const children = Array.isArray(tag.children) ? tag.children : [];
  const out: RenderableNode[] = [];
  let bucket: RenderableNode[] = [];
  const flush = () => {
    if (bucket.length === 0) return;
    out.push(new TagClass("PostBentoImages", {}, bucket as Tag["children"]));
    bucket = [];
  };
  for (const child of children) {
    if (
      child &&
      typeof child === "object" &&
      (child as Tag).name === "PostImageRun"
    ) {
      bucket.push(...((child as Tag).children as RenderableNode[]));
      continue;
    }
    flush();
    out.push(collapseImageRuns(child as RenderableNode));
  }
  flush();
  return new TagClass(tag.name, tag.attributes, out as Tag["children"]);
}

// `renderers.html` escapes and serialises one Tag with no children, so splitting
// off the closing tag gives the escaped open tag for re-emitting a container
// around a child segment boundary.
function tagParts(
  name: string,
  attributes: Record<string, unknown>,
): { open: string; close: string } {
  const sentinel = "\u0000";
  const rendered = htmlRenderer(
    new TagClass(name, attributes, [sentinel]) as any,
  );
  const idx = rendered.indexOf(sentinel);
  return {
    open: rendered.slice(0, idx),
    close: rendered.slice(idx + sentinel.length),
  };
}

function imagesFromBento(node: Tag): { src: string; alt: string }[] {
  const children = (node.children ?? []) as RenderableNode[];
  return children
    .map((c) => {
      if (typeof c === "string" || !c || !TagClass.isTag(c)) return null;
      const attrs = c.attributes as { src?: unknown; alt?: unknown };
      if (c.name !== "img" || typeof attrs.src !== "string") return null;
      return {
        src: attrs.src,
        alt: typeof attrs.alt === "string" ? attrs.alt : "",
      };
    })
    .filter((x): x is { src: string; alt: string } => x !== null);
}

function hasSegment(node: RenderableNode): boolean {
  if (typeof node === "string" || !node || !TagClass.isTag(node)) return false;
  if (node.name === "Mermaid" || node.name === "PostBentoImages") return true;
  return ((node.children ?? []) as RenderableNode[]).some(hasSegment);
}

function segmentTag(node: RenderableNode, out: BodySegment[]): void {
  if (typeof node === "string") {
    out.push({ kind: "html", html: htmlRenderer(node) });
    return;
  }
  if (!node || !TagClass.isTag(node)) return;
  if (node.name === "Mermaid") {
    out.push({
      kind: "mermaid",
      chart: String((node.attributes as any).chart ?? ""),
    });
    return;
  }
  if (node.name === "PostBentoImages") {
    out.push({ kind: "bento", images: imagesFromBento(node) });
    return;
  }
  // No island anywhere below this node — render the whole subtree as HTML.
  if (!hasSegment(node)) {
    out.push({ kind: "html", html: htmlRenderer(node) });
    return;
  }
  const { open, close } = tagParts(
    node.name,
    node.attributes as Record<string, unknown>,
  );
  out.push({ kind: "html", html: open });
  for (const child of (node.children ?? []) as RenderableNode[]) {
    segmentTag(child, out);
  }
  out.push({ kind: "html", html: close });
}

// Post/project body: Markdoc transform + bento collapse + segmentation, plus
// the heading list for the table of contents. Both come from the same pass so
// the TOC anchors and the rendered `id`s can't drift apart.
export function renderBody(content: string): {
  segments: BodySegment[];
  headings: Heading[];
} {
  const node = Markdoc.parse(content || "");
  const headings = extractHeadings(node);
  const transformed = Markdoc.transform(node, buildMarkdocConfig());
  const collapsed = collapseImageRuns(transformed as RenderableNode);
  // Segment the root too (Markdoc's document node renders as <article>), so the
  // emitted markup matches what the React renderer produced before.
  const segments: BodySegment[] = [];
  segmentTag(collapsed, segments);
  return { segments, headings };
}

// Plain Markdoc → HTML, for short thought bodies on the feed. Same default
// pipeline the old client-side `renderMarkdoc` used, but resolved on the server
// so @markdoc/markdoc leaves the client bundle.
export function renderMarkdownHtml(body: string): string {
  if (!body.trim()) return "";
  try {
    return htmlRenderer(Markdoc.transform(Markdoc.parse(body)));
  } catch {
    const escaped = body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre class="whitespace-pre-wrap font-sans text-[15px] text-light-secondary/90">${escaped}</pre>`;
  }
}
