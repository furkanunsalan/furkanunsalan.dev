import { getBlogPosts } from "@/lib/get-blog-posts";
import type { BlogPost } from "@/types";
import { Metadata } from "next";
import BlogPosts from "@/components/BlogPosts";
import { BlogPostFields } from "@/types/contentful";
import { getContentfulPosts } from "@/lib/contentful";

export const metadata: Metadata = {
  title: "Writing | Furkan Ünsalan",
  description:
    "Read insightful posts covering a range of topics, from personal experiences and professional insights to tips, trends, and thought-provoking ideas. Stay informed and inspired with my latest articles.",
};

export default async function WritingPage() {
  const posts: BlogPostFields[] = await getContentfulPosts();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mt-16">
      <h1 className="text-4xl font-bold text-center mb-4">Thoughts & Ideas</h1>
      <p className="text-lg text-justify mb-8 text-gray-600 dark:text-gray-400">
        Welcome to my writing space where I share insights, guides, and
        reflections on various topics in technology and beyond. Explore my
        latest posts and join the conversation! Also check-out these posts in my{" "}
        <a
          href="https://medium.com/@furkanunsalan"
          className="underline hover:text-accent-primary transition-all duration-200"
        >
          Medium
        </a>{" "}
        page and{" "}
        <a
          href="/rss.xml"
          className="underline hover:text-accent-primary transition-all duration-200"
        >
          RSS Feed
        </a>
        .
      </p>
      <BlogPosts posts={posts} />
    </div>
  );
}
