import { Metadata } from "next";
import BlogPosts from "@/components/BlogPosts";
import { getPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Writing | Furkan Ünsalan",
  description:
    "Read insightful posts covering a range of topics, from personal experiences and professional insights to tips, trends, and thought-provoking ideas.",
};

export default async function WritingPage() {
  const posts = await getPosts();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
      <BlogPosts posts={posts} />
    </div>
  );
}
