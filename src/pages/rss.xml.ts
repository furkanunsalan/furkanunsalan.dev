import type { APIRoute } from "astro";
import Markdoc from "@markdoc/markdoc";
import { getPosts, getPostBySlug, getThoughts } from "@/lib/content";

export const prerender = false;

type FeedEntry = {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  content: string;
  tags: string[];
};

// Escape the five XML predefined entities for bare-text nodes (titles live in
// CDATA, but category values and the channel header are raw text).
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Strip Markdoc/markdown noise down to a short plain-text title for a thought,
// which has no title of its own. Falls back to an image-count label.
function thoughtTitle(body: string, imageCount: number): string {
  const text = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → label
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return imageCount > 0
      ? `Thought with ${imageCount} image${imageCount === 1 ? "" : "s"}`
      : "Thought";
  }
  return text.length > 90 ? text.slice(0, 87).trimEnd() + "…" : text;
}

export const GET: APIRoute = async () => {
  const [posts, thoughts] = await Promise.all([getPosts(), getThoughts()]);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://furkanunsalan.dev";

  const postEntries: FeedEntry[] = await Promise.all(
    posts.map(async (post) => {
      const full = await getPostBySlug(post.slug);
      const html = full
        ? Markdoc.renderers.html(Markdoc.transform(full.node))
        : "";
      return {
        title: post.title,
        link: `${baseUrl}/writing/${post.slug}`,
        guid: post.slug,
        pubDate: new Date(post.date).toUTCString(),
        content: html,
        tags: post.tags ?? [],
      };
    }),
  );

  const thoughtEntries: FeedEntry[] = thoughts.map((t) => {
    const bodyHtml = t.body
      ? Markdoc.renderers.html(Markdoc.transform(Markdoc.parse(t.body)))
      : "";
    const imagesHtml = t.images
      .map(
        (src) =>
          `<p><img src="${src.startsWith("http") ? src : baseUrl + src}" alt="" /></p>`,
      )
      .join("");
    return {
      title: thoughtTitle(t.body, t.images.length),
      link: `${baseUrl}/writing#t-${t.id}`,
      guid: `thought-${t.id}`,
      pubDate: new Date(t.createdAt).toUTCString(),
      content: bodyHtml + imagesHtml,
      tags: t.tags ?? [],
    };
  });

  const entries = [...postEntries, ...thoughtEntries].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );

  const currentDate = new Date().toUTCString();

  const rssXml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
    <channel>
        <title>Writings &amp; thoughts RSS feed by Furkan Ünsalan</title>
        <link>${baseUrl}/writing</link>
        <description>Stay up to date with my latest writings and thoughts</description>
        <lastBuildDate>${currentDate}</lastBuildDate>
        <docs>https://validator.w3.org/feed/docs/rss2.html</docs>
        <generator>Next.js RSS Generator</generator>
        <language>en</language>
        <copyright>All rights reserved ${new Date().getFullYear()}, Furkan Ünsalan</copyright>
        ${entries
          .map(
            (entry) => `
        <item>
            <title><![CDATA[${entry.title}]]></title>
            <link>${entry.link}</link>
            <guid isPermaLink="false">${entry.guid}</guid>
            <pubDate>${entry.pubDate}</pubDate>
            <content:encoded><![CDATA[${entry.content}]]></content:encoded>
            ${entry.tags.map((tag: string) => `<category>${escapeXml(tag)}</category>`).join("") || ""}
        </item>`,
          )
          .join("")}
    </channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      "content-type": "application/rss+xml",
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
};
