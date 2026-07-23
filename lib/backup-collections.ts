import { schema } from "@/lib/db";
import type { PgTable } from "drizzle-orm/pg-core";

export type CollectionSpec = {
  short: string;
  table: PgTable;
  pk: string;
  revalidateKey?: string;
};

export const COLLECTIONS: Record<string, CollectionSpec> = {
  posts: {
    short: "posts",
    table: schema.posts,
    pk: "slug",
    revalidateKey: "posts",
  },
  thoughts: {
    short: "thoughts",
    table: schema.thoughts,
    pk: "id",
    revalidateKey: "thoughts",
  },
  projects: {
    short: "projects",
    table: schema.projects,
    pk: "slug",
    revalidateKey: "projects",
  },
  experiences: {
    short: "experiences",
    table: schema.experiences,
    pk: "id",
    revalidateKey: "experiences",
  },
  tools: {
    short: "tools",
    table: schema.tools,
    pk: "name",
    revalidateKey: "tools",
  },
  places: {
    short: "places",
    table: schema.places,
    pk: "slug",
    revalidateKey: "places",
  },
  "place-lists": {
    short: "place-lists",
    table: schema.placeLists,
    pk: "name",
    revalidateKey: "placeLists",
  },
  "home-settings": {
    short: "home-settings",
    table: schema.homeSettings,
    pk: "id",
    revalidateKey: "home",
  },
  "github-visibility": {
    short: "github-visibility",
    table: schema.githubProjectVisibility,
    pk: "id",
    revalidateKey: "github",
  },
};

export function getCollection(short: string): CollectionSpec | null {
  return COLLECTIONS[short] ?? null;
}

export const COLLECTION_LIST = Object.values(COLLECTIONS);
