-- Remove duplicate legacy admin write policies on the PMKP standards table.
DROP POLICY IF EXISTS pmkp_standard_admin_insert ON public."PmkpStandard";
DROP POLICY IF EXISTS pmkp_standard_admin_update ON public."PmkpStandard";
DROP POLICY IF EXISTS pmkp_standard_admin_delete ON public."PmkpStandard";
