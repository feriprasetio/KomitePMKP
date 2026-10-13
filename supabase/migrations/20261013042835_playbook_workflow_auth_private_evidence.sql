-- Workflow/authentication fields and invite-only Supabase Auth for Dokumen Akreditasi PMKP.
-- This migration is additive and is intended to run after the core schema and Playbook seed.

ALTER TABLE public."PmkpDocument"
  ADD COLUMN IF NOT EXISTS "playbookKey" text,
  ADD COLUMN IF NOT EXISTS "criterion" text,
  ADD COLUMN IF NOT EXISTS "programSuggestion" text,
  ADD COLUMN IF NOT EXISTS "implementation" text,
  ADD COLUMN IF NOT EXISTS "checklistData" jsonb NOT NULL DEFAULT '{"checks":{},"version":1}'::jsonb,
  ADD COLUMN IF NOT EXISTS "sortOrder" integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS "PmkpDocument_playbookKey_key"
  ON public."PmkpDocument" ("playbookKey");
CREATE INDEX IF NOT EXISTS "PmkpDocument_sortOrder_idx"
  ON public."PmkpDocument" ("sortOrder");

ALTER TABLE public."PmkpAttachment"
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS description text;

CREATE TABLE IF NOT EXISTS public."PmkpAllowedUser" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public."PmkpAllowedUser" ENABLE ROW LEVEL SECURITY;

-- Explicit table grants after the core schema's deny-by-default grants.
REVOKE ALL ON TABLE public."PmkpStandard", public."PmkpDocument", public."PmkpActivity", public."PmkpAttachment", public."PmkpAllowedUser" FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."PmkpStandard", public."PmkpDocument", public."PmkpAttachment" TO authenticated;
GRANT SELECT, INSERT ON TABLE public."PmkpActivity" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."PmkpAllowedUser" TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Replace the core schema's explicit deny policies with role-based authenticated policies.
DROP POLICY IF EXISTS pmkp_deny_public_all ON public."PmkpStandard";
DROP POLICY IF EXISTS pmkp_deny_public_all ON public."PmkpDocument";
DROP POLICY IF EXISTS pmkp_deny_public_all ON public."PmkpActivity";
DROP POLICY IF EXISTS pmkp_deny_public_all ON public."PmkpAttachment";
DROP POLICY IF EXISTS pmkp_deny_public_all ON public."PmkpAllowedUser";
DROP POLICY IF EXISTS pmkp_authenticated_all ON public."PmkpStandard";
DROP POLICY IF EXISTS pmkp_authenticated_all ON public."PmkpDocument";
DROP POLICY IF EXISTS pmkp_authenticated_all ON public."PmkpAttachment";
DROP POLICY IF EXISTS pmkp_authenticated_read_insert ON public."PmkpActivity";
DROP POLICY IF EXISTS pmkp_activity_insert ON public."PmkpActivity";
CREATE POLICY pmkp_authenticated_all ON public."PmkpStandard"
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY pmkp_authenticated_all ON public."PmkpDocument"
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY pmkp_authenticated_all ON public."PmkpAttachment"
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY pmkp_authenticated_read_insert ON public."PmkpActivity"
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY pmkp_activity_insert ON public."PmkpActivity"
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS pmkp_admin_allowlist ON public."PmkpAllowedUser";
DROP POLICY IF EXISTS pmkp_admin_allowlist_insert ON public."PmkpAllowedUser";
DROP POLICY IF EXISTS pmkp_admin_allowlist_update ON public."PmkpAllowedUser";
DROP POLICY IF EXISTS pmkp_admin_allowlist_delete ON public."PmkpAllowedUser";
CREATE POLICY pmkp_admin_allowlist ON public."PmkpAllowedUser"
  FOR SELECT TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY pmkp_admin_allowlist_insert ON public."PmkpAllowedUser"
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY pmkp_admin_allowlist_update ON public."PmkpAllowedUser"
  FOR UPDATE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY pmkp_admin_allowlist_delete ON public."PmkpAllowedUser"
  FOR DELETE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Invited email allowlist is checked at account creation and determines app_metadata.role.
CREATE OR REPLACE FUNCTION public.pmkp_guard_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_role text;
  v_name text;
BEGIN
  SELECT role, full_name INTO v_role, v_name
  FROM public."PmkpAllowedUser"
  WHERE lower(email) = lower(NEW.email) AND active = true
  LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Alamat email belum diundang ke Dokumen Akreditasi PMKP.';
  END IF;

  NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', v_role);
  NEW.raw_user_meta_data := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('name', COALESCE(NULLIF(NEW.raw_user_meta_data->>'name',''), v_name));
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.pmkp_guard_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pmkp_guard_auth_user() TO postgres, supabase_auth_admin, service_role;
DROP TRIGGER IF EXISTS pmkp_guard_auth_user_trigger ON auth.users;
CREATE TRIGGER pmkp_guard_auth_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.pmkp_guard_auth_user();

-- The storage bucket remains private; access is session-bound. The hardening migration restricts writes to the uploader path.
DROP POLICY IF EXISTS "PMKP evidence read authenticated" ON storage.objects;
DROP POLICY IF EXISTS "PMKP evidence upload authenticated" ON storage.objects;
DROP POLICY IF EXISTS "PMKP evidence delete authenticated" ON storage.objects;
CREATE POLICY "PMKP evidence read authenticated" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'pmkp-evidence' AND auth.uid() IS NOT NULL);
CREATE POLICY "PMKP evidence upload authenticated" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pmkp-evidence' AND auth.uid() IS NOT NULL);
CREATE POLICY "PMKP evidence delete authenticated" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'pmkp-evidence' AND auth.uid() IS NOT NULL);
