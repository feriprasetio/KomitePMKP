-- The old index was partial (WHERE "playbookKey" IS NOT NULL), so PostgreSQL
-- could not infer it for ON CONFLICT ("playbookKey"). Replace it with a full
-- UNIQUE constraint; PostgreSQL still allows multiple NULL values.
DROP INDEX IF EXISTS public."PmkpDocument_playbookKey_key";
ALTER TABLE public."PmkpDocument"
  ADD CONSTRAINT "PmkpDocument_playbookKey_key" UNIQUE ("playbookKey");
