// Updated lib/get-blog-posts.ts
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import fs from "fs";
import path from "path";

export async function getBlogPostBySlug(slug: string) {
  const filePath = path.join(
    process.cwd(),
    "app/(pages)/writing/posts",
    `${slug}.md`
  );
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);
  const processedContent = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(content);
  const contentHtml = processedContent.toString();
  return {
    title: data.title,
    date: data.date,
    description: data.description || "", // Add description here
    tags: data.tags || [],
    content: contentHtml,
  };
}

export async function getBlogPosts() {
  const blogDir = path.join(process.cwd(), "app/(pages)/writing/posts");
  const files = fs.readdirSync(blogDir);
  const posts = files.map((filename) => {
    const filePath = path.join(blogDir, filename);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(fileContent);
    return {
      slug: filename.replace(".md", ""),
      title: data.title,
      date: data.date,
      description: data.description || "", // Add description here
      tags: data.tags || [],
    };
  });
  return posts;
}