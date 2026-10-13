-- Required by the browser workspace upsert using onConflict: "playbookKey".
-- PostgreSQL UNIQUE constraints allow multiple NULL values; existing nullable keys are preserved.
ALTER TABLE public."PmkpDocument"
  ADD CONSTRAINT "PmkpDocument_playbookKey_key" UNIQUE ("playbookKey");
