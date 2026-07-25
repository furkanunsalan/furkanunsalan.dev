"use client";

import React, { useMemo } from "react";
import Markdoc, { type Config, type Schema, Tag } from "@markdoc/markdoc";
import PostBentoImages from "@/components/PostBentoImages";
import Mermaid from "@/components/Mermaid";

// Client-only renderer for a custom project's Markdoc body. Astro can't hydrate
// React nested inside a server-rendered Markdoc React tree, so the parse +
// transform + renderers.react all happen in the browser here from the raw
// content string. Ports the fence -> Mermaid and image-bento logic from the
// Next writing/[slug] page. No TOC: the project column is narrow (max-w-3xl,
// matching the bespoke showcases) and has no room for a sidebar.

function nodeText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(nodeText).join(" ");
  if (node.type === "text") return String(node.attributes?.content ?? "");
  return nodeText(node.children);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Fresh config per render so heading ids dedup deterministically run to run.
function buildMarkdocConfig(): Config {
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
      const base = slugify(text);
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      const id = attributes.id || (count > 0 ? `${base}-${count}` : base);
      return new Tag(`h${attributes.level}`, { ...attributes, id }, children);
    },
  };
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
        return new Tag("PostImageRun", {}, meaningful as (Tag | string)[]);
      }
      return new Tag("p", {}, children);
    },
  };
  const fence: Schema = {
    attributes: {
      content: { type: String, render: false, required: true },
      language: { type: String, render: "data-language" },
      process: { type: Boolean, render: false, default: true },
    },
    transform(node, config) {
      const content = String(node.attributes.content ?? "");
      if ((node.attributes.language as string) === "mermaid") {
        return new Tag("Mermaid", { chart: content });
      }
      const children = node.children.length
        ? node.transformChildren(config)
        : [content];
      return new Tag(
        "pre",
        { "data-language": node.attributes.language },
        children,
      );
    },
  };
  return { nodes: { heading, paragraph, fence } };
}

type RenderableNode = Tag | string;

// Merge runs of consecutive PostImageRun tags into a single PostBentoImages tag
// at the document level, so images split across paragraphs still form one bento.
function collapseImageRuns(node: RenderableNode): RenderableNode {
  if (typeof node === "string" || !node || typeof node !== "object")
    return node;
  const tag = node as Tag;
  const children = Array.isArray(tag.children) ? tag.children : [];
  const out: RenderableNode[] = [];
  let bucket: RenderableNode[] = [];
  const flush = () => {
    if (bucket.length === 0) return;
    out.push(new Tag("PostBentoImages", {}, bucket as Tag["children"]));
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
  return new Tag(tag.name, tag.attributes, out as Tag["children"]);
}

export default function ProjectBody({ content }: { content: string }) {
  const rendered = useMemo(() => {
    const node = Markdoc.parse(content || "");
    const transformed = Markdoc.transform(node, buildMarkdocConfig());
    const collapsed = collapseImageRuns(transformed as RenderableNode);
    const rendered = Markdoc.renderers.react(collapsed as any, React, {
      components: {
        Mermaid: ({ chart }: { chart?: string }) => (
          <Mermaid chart={chart ?? ""} />
        ),
        PostBentoImages: ({ children }: { children?: React.ReactNode }) => {
          const arr = React.Children.toArray(children) as any[];
          const images = arr
            .map((el) => {
              const props = (el && el.props) || {};
              const src = props.src as string | undefined;
              if (!src) return null;
              return { src, alt: (props.alt as string) || "" };
            })
            .filter((x): x is { src: string; alt: string } => !!x);
          if (images.length === 0) return null;
          return <PostBentoImages images={images} />;
        },
      },
    });
    return rendered;
  }, [content]);

  return (
    <article className="min-w-0">
      <div
        className="prose prose-invert max-w-none animate-fade-in delay-150
        prose-a:text-accent-primary prose-a:transition-colors prose-a:duration-200
        prose-blockquote:border-l-accent-primary
        prose-code:text-accent-primary
        prose-headings:font-bold
        prose-headings:text-white
        prose-headings:scroll-mt-24
        text-light-secondary/90"
      >
        {rendered}
      </div>
    </article>
  );
}
