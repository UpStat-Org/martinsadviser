-- ============================================================================
-- update_org_branding — let org admins (not just owners) edit branding
--
-- The base RLS policy "org owners update their organization" gates UPDATE on
-- public.organizations behind has_org_role(id, 'owner'). That's deliberately
-- strict: the row also holds feature_flags and subscription_status, which an
-- admin shouldn't be able to flip.
--
-- White-label colors, though, are a day-to-day setting an org admin should be
-- able to change. Rather than widen the table policy (which would also expose
-- flags/billing to admins), this SECURITY DEFINER function checks
-- is_org_admin() and writes ONLY the branding column.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_org_branding(p_org_id uuid, p_branding jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Not authorized to edit branding for this organization';
  END IF;

  UPDATE public.organizations
     SET branding = p_branding
   WHERE id = p_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_org_branding(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_org_branding(uuid, jsonb) TO authenticated;
