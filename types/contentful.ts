import { EntrySkeletonType, Asset } from "contentful";
import { Document } from "@contentful/rich-text-types";
import { Experience } from "@/types";

export interface BlogPostFields {
  title: string;
  slug: string;
  date: string;
  tags: string[];
  body: Document;
}

export type BlogPostSkeleton = EntrySkeletonType<BlogPostFields, "blog">;

// Contentful field names (different from Experience type)
export interface ContentfulExperienceFields {
  organization: string;
  title: string;
  startDate: string;
  endDate?: string;
  comment: string;
  link?: string[];
  images?: Asset[];
}

export type ExperienceSkeleton = EntrySkeletonType<
  ContentfulExperienceFields,
  "experiences"
>;
