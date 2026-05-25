CREATE TYPE "public"."home_social_icon" AS ENUM('github', 'linkedin', 'mail', 'cv', 'medium', 'rss', 'x', 'youtube', 'instagram', 'mastodon', 'bluesky', 'globe');--> statement-breakpoint
CREATE TYPE "public"."place_status" AS ENUM('want-to-go', 'been', 'favorite');--> statement-breakpoint
CREATE TYPE "public"."tool_category" AS ENUM('tech', 'desk', 'other');--> statement-breakpoint
CREATE TABLE "admin_logins" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"ok" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" text PRIMARY KEY NOT NULL,
	"order" integer DEFAULT 100 NOT NULL,
	"organization" text NOT NULL,
	"title" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"comment" text DEFAULT '' NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"images" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_project_visibility" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"pin_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_project_visibility_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "home_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"timezone" text DEFAULT 'Europe/Istanbul' NOT NULL,
	"timezone_label" text DEFAULT 'IST' NOT NULL,
	"pgp_id" text DEFAULT '' NOT NULL,
	"socials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "places" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"list" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"status" "place_status" DEFAULT 'want-to-go' NOT NULL,
	"source_url" text,
	"added_at" timestamp with time zone,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date" date NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"banner" text,
	"content" text DEFAULT '' NOT NULL,
	"excerpt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"metric" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"language" text,
	"order" integer DEFAULT 100 NOT NULL,
	"image" text,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"name" text PRIMARY KEY NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"what" text DEFAULT '' NOT NULL,
	"category" "tool_category" DEFAULT 'tech' NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
