import { EntrySkeletonType } from 'contentful';
import { Document } from '@contentful/rich-text-types';

export interface BlogPostFields {
  title: string;
  slug: string;
  date: string;
  tags: string[];
  body: Document;
}

export type BlogPostSkeleton = EntrySkeletonType<BlogPostFields, 'blog'>;