import {
  pgTable,
  pgEnum,
  text,
  integer,
  doublePrecision,
  boolean,
  date,
  timestamp,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";

// ---- enums ---------------------------------------------------------------

export const placeStatusEnum = pgEnum("place_status", [
  "want-to-go",
  "been",
  "favorite",
]);

export const toolCategoryEnum = pgEnum("tool_category", [
  "tech",
  "desk",
  "other",
]);

export const homeSocialIconEnum = pgEnum("home_social_icon", [
  "github",
  "linkedin",
  "mail",
  "cv",
  "medium",
  "rss",
  "x",
  "youtube",
  "instagram",
  "mastodon",
  "bluesky",
  "globe",
]);

// ---- posts ---------------------------------------------------------------

export const posts = pgTable("posts", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  date: date("date").notNull(),
  tags: text("tags").array().notNull().default([]),
  banner: text("banner"),
  content: text("content").notNull().default(""),
  excerpt: text("excerpt"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---- projects (custom) ---------------------------------------------------

export const projects = pgTable("projects", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  metric: text("metric").notNull().default(""),
  link: text("link").notNull().default(""),
  language: text("language"),
  order: integer("order").notNull().default(100),
  image: text("image"),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---- experiences ---------------------------------------------------------

// Links are stored as a typed jsonb array so we don't need a join table for a
// handful of items per role.
export type ExperienceLink = { label: string; url: string };

export const experiences = pgTable("experiences", {
  id: text("id").primaryKey(), // keep Keystatic's slug-style id (e.g. acme-2024-engineer)
  order: integer("order").notNull().default(100),
  organization: text("organization").notNull(),
  title: text("title").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  comment: text("comment").notNull().default(""),
  links: jsonb("links").$type<ExperienceLink[]>().notNull().default([]),
  images: text("images").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---- tools ---------------------------------------------------------------

export const tools = pgTable("tools", {
  name: text("name").primaryKey(), // slug
  brand: text("brand").notNull().default(""),
  what: text("what").notNull().default(""),
  category: toolCategoryEnum("category").notNull().default("tech"),
  comment: text("comment").notNull().default(""),
  favorite: boolean("favorite").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---- places --------------------------------------------------------------

export const places = pgTable("places", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  address: text("address").notNull().default(""),
  list: text("list").notNull().default(""),
  category: text("category").notNull().default(""),
  country: text("country").notNull().default(""),
  city: text("city").notNull().default(""),
  status: placeStatusEnum("status").notNull().default("want-to-go"),
  sourceUrl: text("source_url"),
  addedAt: timestamp("added_at", { withTimezone: true }),
  tags: text("tags").array().notNull().default([]),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---- singletons ----------------------------------------------------------

// Home settings. Locked to a single row (id = 1) by application convention.
export type HomeSocial = {
  name: string;
  url: string;
  icon:
    | "github"
    | "linkedin"
    | "mail"
    | "cv"
    | "medium"
    | "rss"
    | "x"
    | "youtube"
    | "instagram"
    | "mastodon"
    | "bluesky"
    | "globe";
};

export const homeSettings = pgTable("home_settings", {
  id: integer("id").primaryKey(),
  intro: text("intro").notNull().default(""),
  timezone: text("timezone").notNull().default("Europe/Istanbul"),
  timezoneLabel: text("timezone_label").notNull().default("IST"),
  pgpId: text("pgp_id").notNull().default(""),
  socials: jsonb("socials").$type<HomeSocial[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// GitHub project visibility — one row per repo.
export const githubProjectVisibility = pgTable("github_project_visibility", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  visible: boolean("visible").notNull().default(true),
  pinned: boolean("pinned").notNull().default(false),
  pinOrder: integer("pin_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---- place lists (manageable taxonomy for /places) -----------------------

export const placeLists = pgTable("place_lists", {
  name: text("name").primaryKey(),
  icon: text("icon").notNull().default("map-pin"),
  position: integer("position").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---- admin audit (optional, used by login throttle) ----------------------

export const adminLogins = pgTable("admin_logins", {
  id: serial("id").primaryKey(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  ip: text("ip"),
  ok: boolean("ok").notNull(),
});
