ALTER TABLE "cv_settings" ALTER COLUMN "contact" SET DEFAULT '{"address":"","phone":"","web":""}'::jsonb;--> statement-breakpoint
ALTER TABLE "home_settings" ADD COLUMN "location" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "home_settings" ADD COLUMN "focus" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "home_settings" ADD COLUMN "watching" text DEFAULT '' NOT NULL;