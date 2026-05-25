CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"row_id" text NOT NULL,
	"ip" text,
	"before" jsonb,
	"after" jsonb
);
