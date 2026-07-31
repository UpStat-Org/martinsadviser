-- ============================================================================
-- update_org_hourly_rate — let org admins edit the labor rate
--
-- organizations.default_hourly_rate was added by 20260521300000_time_tracking
-- and feeds the labor-cost side of /profit-per-client. Until now nothing wrote
-- to it: the base RLS policy gates UPDATE on public.organizations behind
-- has_org_role(id, 'owner'), and the column has no UI at all — so every org has
-- been reporting profit against the hard-coded 50.00 default.
--
-- Same shape as update_org_branding (20260522180000): a SECURITY DEFINER
-- function that checks is_org_admin() and writes ONLY this column, so admins
-- don't gain write access to feature_flags or subscription_status by sharing
-- the table policy.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_org_hourly_rate(p_org_id uuid, p_rate numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Not authorized to edit the hourly rate for this organization';
  END IF;

  -- Guard the arithmetic downstream: a negative rate would invert every margin
  -- on the profit report, and NULL would make the column NOT NULL constraint
  -- fail with a much less obvious message.
  IF p_rate IS NULL OR p_rate < 0 THEN
    RAISE EXCEPTION 'Hourly rate must be zero or greater';
  END IF;

  UPDATE public.organizations
     SET default_hourly_rate = p_rate
   WHERE id = p_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_org_hourly_rate(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_org_hourly_rate(uuid, numeric) TO authenticated;
