import { createClient, Entry } from "contentful";
import { BlogPostSkeleton, BlogPostFields } from "@/types/contentful";

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID || "",
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN || "",
});

export const getContentfulPosts = async (): Promise<BlogPostFields[]> => {
  const res = await client.getEntries<BlogPostSkeleton>({
    content_type: "blog",
  });

  return res.items.map((item) => item.fields);
};

export const getContentfulPostBySlug = async (
  slug: string,
): Promise<Entry<BlogPostSkeleton> | null> => {
  const res = await client.getEntries<BlogPostSkeleton>({
    content_type: "blog",
    // 👇 safely assert it as any
    "fields.slug": slug,
    locale: "en-US",
  } as any); // acceptable in this specific case

  return res.items[0] ?? null;
};
