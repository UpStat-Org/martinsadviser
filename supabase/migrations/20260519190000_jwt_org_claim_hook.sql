-- ============================================================================
-- Custom Access Token Hook: inject org_id into JWT claims
-- Phase 1, Week 3.
--
-- This function is invoked by Supabase Auth every time a JWT is issued or
-- refreshed. It reads the user's preferred org (from profiles.active_org_id
-- if set, otherwise the oldest approved membership) and injects both
-- `org_id` and `org_role` into the JWT claims.
--
-- After applying this migration, you MUST register the function in the
-- Supabase Dashboard:
--   Authentication → Hooks → "Add a new hook"
--   - Hook type: Custom Access Token
--   - Schema: public
--   - Function: custom_access_token_hook
--
-- Once registered, current_org_id() will read from JWT (preferred path)
-- and stop relying on the membership fallback. Switching org from the
-- frontend means: UPDATE profiles.active_org_id, then
-- supabase.auth.refreshSession() to mint a new token.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Add active_org_id to profiles (user's preferred/last-active org)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Backfill: each profile's active org is their first approved membership.
UPDATE public.profiles p
  SET active_org_id = (
    SELECT om.organization_id
    FROM public.organization_members om
    WHERE om.user_id = p.id AND om.approval_status = 'approved'
    ORDER BY om.joined_at ASC LIMIT 1
  )
  WHERE active_org_id IS NULL;

-- Users can update their own active_org_id (used by switchOrg in frontend)
CREATE POLICY "users update own active_org_id"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2) The hook function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_org_role text;
  v_claims jsonb;
BEGIN
  v_user_id := (event ->> 'user_id')::uuid;
  v_claims := event -> 'claims';

  -- Prefer the user's chosen active org; fall back to oldest approved membership.
  SELECT om.organization_id, om.role::text
  INTO v_org_id, v_org_role
  FROM public.organization_members om
  WHERE om.user_id = v_user_id
    AND om.approval_status = 'approved'
    AND om.organization_id = COALESCE(
      (SELECT active_org_id FROM public.profiles WHERE id = v_user_id),
      om.organization_id
    )
  ORDER BY
    (om.organization_id = (SELECT active_org_id FROM public.profiles WHERE id = v_user_id)) DESC,
    om.joined_at ASC
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    v_claims := jsonb_set(v_claims, '{org_id}', to_jsonb(v_org_id::text));
    v_claims := jsonb_set(v_claims, '{org_role}', to_jsonb(v_org_role));
  END IF;

  RETURN jsonb_set(event, '{claims}', v_claims);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Permissions for supabase_auth_admin (the role that runs the hook)
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- Allow the hook to read membership and profile data despite RLS.
GRANT SELECT ON TABLE public.organization_members TO supabase_auth_admin;
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

-- Lock down the function from being called by clients.
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

-- supabase_auth_admin also needs a policy to bypass RLS on the read paths.
CREATE POLICY "auth_admin read memberships for hook"
  ON public.organization_members FOR SELECT TO supabase_auth_admin
  USING (true);

CREATE POLICY "auth_admin read profiles for hook"
  ON public.profiles FOR SELECT TO supabase_auth_admin
  USING (true);
