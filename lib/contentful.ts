import { createClient, Entry } from "contentful";
import {
  BlogPostSkeleton,
  BlogPostFields,
  ExperienceSkeleton,
  ContentfulExperienceFields,
  ToolSkeleton,
  ProjectSkeleton,
  ContentfulProjectFields,
} from "@/types/contentful";
import { Experience, Tool, Project } from "@/types";

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

export const getContentfulTools = async (): Promise<Tool[]> => {
  const res = await client.getEntries<ToolSkeleton>({
    content_type: "tools",
  });

  return res.items.map((item, index) => {
    return {
      id: index + 1,
      name: item.fields.name,
      comment: item.fields.comment,
      brand: item.fields.brand,
      favorite: item.fields.favorite,
      what: item.fields.what,
      category: item.fields.category,
      link: item.fields.link,
    };
  });
};

export const getContentfulProjects = async (): Promise<Project[]> => {
  const res = await client.getEntries<ProjectSkeleton>({
    content_type: "projects",
    order: ["-fields.update"] as any,
  });

  return res.items.map((item, index) => {
    const baseProject = {
      id: index + 1,
      slug: item.fields.slug,
      title: item.fields.title,
      short_description: item.fields.shortDescription,
      update: item.fields.update,
    };

    if (item.fields.private) {
      return {
        ...baseProject,
        private: true as const,
        long_description: item.fields.longDescription || "",
      };
    } else {
      return {
        ...baseProject,
        private: false as const,
        repo: item.fields.repo || "",
        owner: item.fields.owner || "",
        branch: item.fields.branch || "main",
      };
    }
  });
};

export const getContentfulProjectBySlug = async (
  slug: string,
): Promise<Project | null> => {
  const res = await client.getEntries<ProjectSkeleton>({
    content_type: "projects",
    "fields.slug": slug,
    locale: "en-US",
  } as any);

  if (res.items.length === 0) {
    return null;
  }

  const item = res.items[0];
  const baseProject = {
    id: 1, // We don't have an index here, but it's not critical for single project view
    slug: item.fields.slug,
    title: item.fields.title,
    short_description: item.fields.shortDescription,
    update: item.fields.update,
  };

  if (item.fields.private) {
    return {
      ...baseProject,
      private: true as const,
      long_description: item.fields.longDescription || "",
    };
  } else {
    return {
      ...baseProject,
      private: false as const,
      repo: item.fields.repo || "",
      owner: item.fields.owner || "",
      branch: item.fields.branch || "main",
    };
  }
};
