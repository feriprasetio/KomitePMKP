-- Backfill Playbook-facing fields from the original extracted source columns without overwriting existing work.
-- This is deliberately additive: status, progress, checklistData, dueDate, PIC and notes are not modified.
WITH ranked AS (
  SELECT d.id,
         row_number() OVER (
           ORDER BY COALESCE(s."sortOrder", 999), COALESCE(d."sourcePage", 999), d.id
         )::integer AS seq
  FROM public."PmkpDocument" d
  LEFT JOIN public."PmkpStandard" s ON s.id = d."standardId"
)
UPDATE public."PmkpDocument" d
SET
  "sortOrder" = ranked.seq,
  "criterion" = COALESCE(NULLIF(btrim(d."criterion"), ''), NULLIF(btrim(d."elementAssessment"), ''), NULLIF(btrim(d.description), ''), ''),
  "programSuggestion" = COALESCE(NULLIF(btrim(d."programSuggestion"), ''), NULLIF(btrim(d."programWork"), ''), ''),
  "implementation" = COALESCE(NULLIF(btrim(d."implementation"), ''), NULLIF(btrim(d."implementationActivity"), ''), ''),
  "regulasiDocs" = CASE
    WHEN d."regulasiDocs" IS NULL OR btrim(d."regulasiDocs") IN ('', '[]')
    THEN COALESCE(NULLIF(btrim(d."regulationRecommendation"), ''), '[]')
    ELSE d."regulasiDocs"
  END,
  "adminDocs" = CASE
    WHEN d."adminDocs" IS NULL OR btrim(d."adminDocs") IN ('', '[]')
    THEN COALESCE(NULLIF(btrim(d."administrativeDocuments"), ''), '[]')
    ELSE d."adminDocs"
  END,
  "pendukungDocs" = CASE
    WHEN d."pendukungDocs" IS NULL OR btrim(d."pendukungDocs") IN ('', '[]')
    THEN COALESCE(NULLIF(btrim(d."supportingFacilities"), ''), '[]')
    ELSE d."pendukungDocs"
  END
FROM ranked
WHERE d.id = ranked.id;
