import { getBlogPosts } from "@/lib/getBlogPosts";
import type { BlogPost } from "@/types";
import { Metadata } from "next";
import BlogPosts from "@/components/BlogPosts";

export const metadata: Metadata = {
  title: "Blog | Furkan Ünsalan",
  description:
    "Read insightful blog posts covering a range of topics, from personal experiences and professional insights to tips, trends, and thought-provoking ideas. Stay informed and inspired with my latest articles.",
};

export default async function BlogPage() {
  const posts: BlogPost[] = await getBlogPosts();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mt-16">
      <h1 className="text-4xl font-bold text-center mb-4">Thoughts & Ideas</h1>
      <p className="text-lg text-justify mb-8 text-gray-600 dark:text-gray-400">
        Welcome to my blog where I share insights, tutorials, and reflections on
        various topics in technology and beyond. Explore my latest articles and
        join the conversation!
      </p>

      <BlogPosts posts={posts} />
    </div>
  );
}
