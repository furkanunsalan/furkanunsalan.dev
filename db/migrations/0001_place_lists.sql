CREATE TABLE "place_lists" (
	"name" text PRIMARY KEY NOT NULL,
	"icon" text DEFAULT 'map-pin' NOT NULL,
	"position" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
