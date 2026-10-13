-- Keep allowed evidence formats aligned with the upload control in the PMKP workspace.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY(
  SELECT DISTINCT mime_type
  FROM unnest(COALESCE(allowed_mime_types, ARRAY[]::text[]) || ARRAY['image/webp']::text[]) AS m(mime_type)
  ORDER BY mime_type
)
WHERE id = 'pmkp-evidence';
