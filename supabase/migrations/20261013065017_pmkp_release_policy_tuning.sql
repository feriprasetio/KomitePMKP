-- Final RLS policy tuning for the dedicated PMKP workspace.
-- Keep standards read-only for members, and evaluate JWT claims once per statement.
DROP POLICY IF EXISTS pmkp_standard_admin_write ON public."PmkpStandard";
DROP POLICY IF EXISTS pmkp_standard_admin_insert ON public."PmkpStandard";
DROP POLICY IF EXISTS pmkp_standard_admin_update ON public."PmkpStandard";
DROP POLICY IF EXISTS pmkp_standard_admin_delete ON public."PmkpStandard";
CREATE POLICY pmkp_standard_admin_insert ON public."PmkpStandard" FOR INSERT TO authenticated
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY pmkp_standard_admin_update ON public."PmkpStandard" FOR UPDATE TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY pmkp_standard_admin_delete ON public."PmkpStandard" FOR DELETE TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS pmkp_activity_insert ON public."PmkpActivity";
CREATE POLICY pmkp_activity_insert ON public."PmkpActivity" FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND actor = ((SELECT auth.jwt()) ->> 'email'));
