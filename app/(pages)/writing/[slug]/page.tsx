import { notFound } from "next/navigation";
import Markdoc, { Config, Schema, Tag } from "@markdoc/markdoc";
import Image from "next/image";
import React from "react";
import { getPostBySlug } from "@/lib/content";
import TableOfContents, { type Heading } from "@/components/TableOfContents";
import PostBentoImages from "@/components/PostBentoImages";

interface BlogPostProps {
  params: { slug: string };
}

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

function calculateReadingTime(node: any): string {
  const words = nodeText(node).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

function extractHeadings(node: any): Heading[] {
  const items: Heading[] = [];
  const seen = new Map<string, number>();
  const walk = (n: any) => {
    if (!n) return;
    if (n.type === "heading") {
      const text = nodeText(n).trim();
      const level = (n.attributes?.level as number) || 1;
      let id = slugify(text);
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
// using the same slug+counter logic as extractHeadings.
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
        return new Tag("PostImageRun", {}, meaningful as (Tag | string)[]);
      }
      return new Tag("p", {}, children);
    },
  };
  return { nodes: { heading, paragraph } };
}

type RenderableNode = Tag | string;

// Merge runs of consecutive PostImageRun tags into a single PostBentoImages
// tag at the document level. This lets the user split images across separate
// paragraphs and still get one bento group.
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

// DB-backed: rendered on demand. Skipping generateStaticParams means CI never
// tries to call the VPS pg at build time.
export const dynamic = "force-dynamic";

export default async function BlogPost({ params }: BlogPostProps) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const headings = extractHeadings(post.node);
  const transformed = Markdoc.transform(post.node, buildMarkdocConfig());
  const collapsed = collapseImageRuns(transformed as RenderableNode);
  const rendered = Markdoc.renderers.react(collapsed as any, React, {
    components: {
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
  const readingTime = calculateReadingTime(post.node);

  return (
    <div className="mt-24 mb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
        <article className="min-w-0">
          <header className="mb-8 animate-fade-in-up">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {post.title}
            </h1>
            <div className="text-xs sm:text-sm text-light-fourth">
              <time>{formattedDate}</time>
              <span className="mx-2">•</span>
              <span>{readingTime}</span>
            </div>

            {post.tags.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <span className="chip">{tag}</span>
                  </li>
                ))}
              </ul>
            )}

            {post.banner && (
              <Image
                src={post.banner}
                alt={post.title}
                width={0}
                height={0}
                priority
                sizes="(max-width: 1024px) 100vw, 768px"
                className="mt-6 max-h-[420px] w-auto h-auto max-w-full rounded-xl ring-1 ring-white/[0.06] animate-fade-in delay-100"
              />
            )}
          </header>

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

        <aside className="hidden lg:block animate-slide-in-right delay-200">
          <TableOfContents headings={headings} />
        </aside>
      </div>
    </div>
  );
}
