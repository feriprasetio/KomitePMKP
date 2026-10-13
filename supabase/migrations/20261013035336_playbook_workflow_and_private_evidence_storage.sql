-- Playbook workflow fields and private evidence bucket. Safe additive migration.
ALTER TABLE public."PmkpDocument"
  ADD COLUMN IF NOT EXISTS "elementCode" text,
  ADD COLUMN IF NOT EXISTS "elementAssessment" text,
  ADD COLUMN IF NOT EXISTS "regulationRecommendation" text,
  ADD COLUMN IF NOT EXISTS "programWork" text,
  ADD COLUMN IF NOT EXISTS "implementationActivity" text,
  ADD COLUMN IF NOT EXISTS "administrativeDocuments" text,
  ADD COLUMN IF NOT EXISTS "supportingFacilities" text,
  ADD COLUMN IF NOT EXISTS "sourcePage" integer,
  ADD COLUMN IF NOT EXISTS "checkedItems" text NOT NULL DEFAULT '[]';
ALTER TABLE public."PmkpAttachment" ADD COLUMN IF NOT EXISTS "evidenceLabel" text;
CREATE INDEX IF NOT EXISTS "PmkpDocument_standardId_status_idx" ON public."PmkpDocument" ("standardId", status);
CREATE INDEX IF NOT EXISTS "PmkpDocument_sourcePage_idx" ON public."PmkpDocument" ("sourcePage");
CREATE INDEX IF NOT EXISTS "PmkpAttachment_evidenceLabel_idx" ON public."PmkpAttachment" ("evidenceLabel");
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pmkp-evidence','pmkp-evidence',false,20971520,ARRAY[
'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
'text/plain','text/csv','image/png','image/jpeg']::text[])
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
