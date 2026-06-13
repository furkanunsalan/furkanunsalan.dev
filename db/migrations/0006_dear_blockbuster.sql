CREATE TYPE "public"."experience_kind" AS ENUM('work', 'volunteer');--> statement-breakpoint
CREATE TABLE "cv_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"header" jsonb DEFAULT '{"name":"","role":""}'::jsonb NOT NULL,
	"contact" jsonb DEFAULT '{"address":"","phone":""}'::jsonb NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"certifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"education" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"projects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"experiences" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "kind" "experience_kind" DEFAULT 'work' NOT NULL;