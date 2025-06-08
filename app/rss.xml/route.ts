// app/rss.xml/route.ts
import { getContentfulPosts } from "@/lib/contentful";
import { BlogPostFields } from "@/types/contentful";
import { NextResponse } from "next/server";
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { Document } from '@contentful/rich-text-types';

export async function GET() {
  const posts = await getContentfulPosts();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://furkanunsalan.dev';
  
  // Sort posts by date (newest first)
  const sortedPosts = [...posts].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Convert rich text to HTML
  const postsWithContent = sortedPosts.map(post => {
    const content = documentToHtmlString(post.body as unknown as Document);
    return {
      ...post,
      content
    };
  });

  const currentDate = new Date().toUTCString();
  
  // Generate RSS XML
  const rssXml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
    <channel>
        <title>Writings RSS feed by Furkan Ünsalan</title>
        <link>${baseUrl}/writing</link>
        <description>Stay up to date with my latest writings</description>
        <lastBuildDate>${currentDate}</lastBuildDate>
        <docs>https://validator.w3.org/feed/docs/rss2.html</docs>
        <generator>Next.js RSS Generator</generator>
        <language>en</language>
        <copyright>All rights reserved ${new Date().getFullYear()}, Furkan Ünsalan</copyright>
        ${postsWithContent.map((post) => `
        <item>
            <title><![CDATA[${post.title}]]></title>
            <link>${baseUrl}/writing/${post.slug}</link>
            <guid>${post.slug}</guid>
            <pubDate>${new Date(post.date).toUTCString()}</pubDate>
            <content:encoded><![CDATA[${post.content}]]></content:encoded>
            ${post.tags?.map((tag: string) => `<category>${tag}</category>`).join('') || ''}
        </item>`).join('')}
    </channel>
</rss>`;

  // Return the RSS feed with the correct content type
  return new NextResponse(rssXml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}