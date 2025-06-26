import { createClient, Entry } from "contentful";
import {
  BlogPostSkeleton,
  BlogPostFields,
  ExperienceSkeleton,
  ContentfulExperienceFields,
} from "@/types/contentful";
import { Experience } from "@/types";

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

export const getContentfulExperiences = async (): Promise<Experience[]> => {
  const res = await client.getEntries<ExperienceSkeleton>({
    content_type: "experiences",
    order: ["-fields.startDate"] as any,
    include: 2, // Include assets (images)
  });

  return res.items.map((item, index) => {
    // Handle images with proper type assertion
    const images = item.fields.images as any[] | undefined;
    const imageUrls =
      images?.map((img: any) => `https:${img.fields.file.url}`) || [];

    return {
      id: index + 1,
      organization: item.fields.organization,
      title: item.fields.title,
      start_date: item.fields.startDate
        ? new Date(item.fields.startDate).toLocaleDateString("en-GB")
        : "",
      end_date: item.fields.endDate
        ? new Date(item.fields.endDate).toLocaleDateString("en-GB")
        : undefined,
      comment: item.fields.comment,
      link: item.fields.link,
      images: imageUrls,
    };
  });
};
