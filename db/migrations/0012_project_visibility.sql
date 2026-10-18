-- Additive and therefore safe to re-run: the production database already
-- carries four columns (`illustration`, `problem`, `decisions`, `outcome`) and
-- four migration records that exist in no branch of this repo, so its journal
-- is ahead of this folder. IF NOT EXISTS keeps a later `db:migrate` a no-op
-- here instead of erroring with "column already exists".
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "visible" boolean DEFAULT true NOT NULL;
