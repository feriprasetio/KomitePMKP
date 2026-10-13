-- Preserve the element-penilaian code as a normalized field for filters/reporting.
UPDATE public."PmkpDocument"
SET "elementCode" = regexp_replace("stdCode", '^PMKP [0-9]+(\.[0-9]+)?', '')
WHERE "elementCode" IS NULL;
