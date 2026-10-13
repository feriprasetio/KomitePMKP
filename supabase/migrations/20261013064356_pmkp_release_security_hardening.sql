-- PMKP production hardening: preserve authenticated collaboration while limiting privileged writes.
-- Apply only to the dedicated Dokumen Akreditasi PMKP project.

REVOKE ALL ON FUNCTION public.pmkp_guard_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pmkp_guard_auth_user() TO postgres, supabase_auth_admin, service_role;

DROP POLICY IF EXISTS pmkp_deny_public_all ON public."User";
CREATE POLICY pmkp_deny_public_all ON public."User" FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS pmkp_authenticated_all ON public."PmkpStandard";
DROP POLICY IF EXISTS pmkp_standard_read_authenticated ON public."PmkpStandard";
DROP POLICY IF EXISTS pmkp_standard_admin_write ON public."PmkpStandard";
CREATE POLICY pmkp_standard_read_authenticated ON public."PmkpStandard" FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY pmkp_standard_admin_write ON public."PmkpStandard" FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS pmkp_authenticated_all ON public."PmkpDocument";
CREATE POLICY pmkp_authenticated_all ON public."PmkpDocument" FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS pmkp_authenticated_read_insert ON public."PmkpActivity";
DROP POLICY IF EXISTS pmkp_activity_insert ON public."PmkpActivity";
CREATE POLICY pmkp_authenticated_read_insert ON public."PmkpActivity" FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY pmkp_activity_insert ON public."PmkpActivity" FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND actor = (SELECT auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS pmkp_authenticated_all ON public."PmkpAttachment";
DROP POLICY IF EXISTS pmkp_attachment_read_authenticated ON public."PmkpAttachment";
DROP POLICY IF EXISTS pmkp_attachment_insert_own ON public."PmkpAttachment";
DROP POLICY IF EXISTS pmkp_attachment_update_own ON public."PmkpAttachment";
DROP POLICY IF EXISTS pmkp_attachment_delete_own ON public."PmkpAttachment";
CREATE POLICY pmkp_attachment_read_authenticated ON public."PmkpAttachment" FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY pmkp_attachment_insert_own ON public."PmkpAttachment" FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND split_part("filePath", '/', 1) = (SELECT auth.uid())::text);
CREATE POLICY pmkp_attachment_update_own ON public."PmkpAttachment" FOR UPDATE TO authenticated
  USING (split_part("filePath", '/', 1) = (SELECT auth.uid())::text)
  WITH CHECK (split_part("filePath", '/', 1) = (SELECT auth.uid())::text);
CREATE POLICY pmkp_attachment_delete_own ON public."PmkpAttachment" FOR DELETE TO authenticated
  USING (split_part("filePath", '/', 1) = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS pmkp_admin_allowlist ON public."PmkpAllowedUser";
DROP POLICY IF EXISTS pmkp_admin_allowlist_insert ON public."PmkpAllowedUser";
DROP POLICY IF EXISTS pmkp_admin_allowlist_update ON public."PmkpAllowedUser";
DROP POLICY IF EXISTS pmkp_admin_allowlist_delete ON public."PmkpAllowedUser";
CREATE POLICY pmkp_admin_allowlist ON public."PmkpAllowedUser" FOR SELECT TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY pmkp_admin_allowlist_insert ON public."PmkpAllowedUser" FOR INSERT TO authenticated
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY pmkp_admin_allowlist_update ON public."PmkpAllowedUser" FOR UPDATE TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY pmkp_admin_allowlist_delete ON public."PmkpAllowedUser" FOR DELETE TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "PMKP evidence read authenticated" ON storage.objects;
DROP POLICY IF EXISTS "PMKP evidence upload authenticated" ON storage.objects;
DROP POLICY IF EXISTS "PMKP evidence delete authenticated" ON storage.objects;
CREATE POLICY "PMKP evidence read authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pmkp-evidence' AND (SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "PMKP evidence upload authenticated" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pmkp-evidence' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "PMKP evidence delete authenticated" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pmkp-evidence' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
