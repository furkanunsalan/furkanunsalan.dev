-- Global search: weighted tsvector per searchable table (A=title, B=facets,
-- C=body) as STORED generated columns, so the index can never drift from the
-- row. Generated columns require IMMUTABLE expressions, which rules out two
-- things: enum columns are left out entirely (enum_out is only STABLE), and
-- array_to_string is wrapped below — it's STABLE only because a generic
-- anyarray may hold a non-immutable element type. For text[] the result really
-- is immutable, so the wrapper is sound.

CREATE OR REPLACE FUNCTION text_array_to_string(text[], text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  STRICT
  PARALLEL SAFE
AS $$ SELECT array_to_string($1, $2) $$;
--> statement-breakpoint

ALTER TABLE "posts" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(text_array_to_string("tags", ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce("excerpt", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("content", '')), 'C')
  ) STORED;
--> statement-breakpoint

ALTER TABLE "projects" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("language", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("metric", '')), 'C') ||
    setweight(to_tsvector('english', coalesce("content", '')), 'C')
  ) STORED;
--> statement-breakpoint

ALTER TABLE "experiences" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("organization", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("comment", '')), 'C')
  ) STORED;
--> statement-breakpoint

ALTER TABLE "tools" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("brand", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("what", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("name", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("comment", '')), 'C')
  ) STORED;
--> statement-breakpoint

ALTER TABLE "places" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("city", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("country", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("category", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(text_array_to_string("tags", ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce("address", '')), 'C') ||
    setweight(to_tsvector('english', coalesce("notes", '')), 'C')
  ) STORED;
--> statement-breakpoint

ALTER TABLE "thoughts" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("body", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(text_array_to_string("tags", ' '), '')), 'B')
  ) STORED;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "posts_search_idx" ON "posts" USING GIN ("search_vector");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_search_idx" ON "projects" USING GIN ("search_vector");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experiences_search_idx" ON "experiences" USING GIN ("search_vector");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tools_search_idx" ON "tools" USING GIN ("search_vector");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "places_search_idx" ON "places" USING GIN ("search_vector");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "thoughts_search_idx" ON "thoughts" USING GIN ("search_vector");--> statement-breakpoint

-- Trigram tier powers the typo-tolerant fallback. pg_trgm is a trusted
-- extension on PG13+, so the database owner can create it — but if this role
-- can't, search still works, just without fuzzy title matching.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'pg_trgm unavailable; fuzzy title fallback disabled';
END
$$;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS posts_title_trgm_idx ON posts USING GIN (title gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS projects_name_trgm_idx ON projects USING GIN (name gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS places_name_trgm_idx ON places USING GIN (name gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS tools_brand_trgm_idx ON tools USING GIN (brand gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS experiences_org_trgm_idx ON experiences USING GIN (organization gin_trgm_ops)';
  END IF;
END
$$;
