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

// Contentful field names (same as Tool type)
export interface ContentfulToolFields {
  name: string;
  comment: string;
  brand: string;
  favorite: boolean;
  what: string;
  category: string;
  link?: string;
}

export type ToolSkeleton = EntrySkeletonType<ContentfulToolFields, "tools">;

// Contentful field names for Projects
export interface ContentfulProjectFields {
  slug: string;
  title: string;
  shortDescription: string;
  update: string;
  private: boolean;
  repo?: string;
  owner?: string;
  branch?: string;
  longDescription?: string;
}

export type ProjectSkeleton = EntrySkeletonType<
  ContentfulProjectFields,
  "projects"
>;
