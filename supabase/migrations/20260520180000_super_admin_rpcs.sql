-- ============================================================================
-- Super-admin layer
--
-- The MartinsAdviser org (cliente 0) needs operator-level access to manage
-- every tenant in the system: list orgs, see their stats, create new orgs,
-- assign owners, edit flags/branding/subscription. Doing that through the
-- existing membership-scoped RLS would require relaxing every table policy,
-- which is risky.
--
-- Instead, this migration ships a thin SECURITY DEFINER layer:
--
--   is_super_admin()                       - gate function, true iff caller
--                                            is owner/admin of MartinsAdviser
--   super_admin_list_orgs()                - cross-tenant org overview + stats
--   super_admin_org_details(org_id)        - one org's settings + members
--   super_admin_create_org(slug, name)     - provision a new tenant
--   super_admin_set_owner(org_id, email)   - promote a known user to owner
--   super_admin_update_org(org_id, patch)  - update branding/flags/status
--
-- Each function checks is_super_admin() first and raises EXCEPTION otherwise.
-- Grants go to `authenticated` (anon callers can't hit these at all).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) is_super_admin gate
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
     WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid
       AND user_id = auth.uid()
       AND approval_status = 'approved'
       AND role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Listing: returns one row per org with cheap aggregate counts.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.super_admin_list_orgs()
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  subscription_status text,
  branding jsonb,
  feature_flags jsonb,
  created_at timestamptz,
  member_count bigint,
  client_count bigint,
  permit_count bigint,
  truck_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden: super-admin only';
  END IF;

  RETURN QUERY
  SELECT
    o.id, o.slug, o.name, o.subscription_status, o.branding, o.feature_flags, o.created_at,
    (SELECT count(*) FROM public.organization_members om WHERE om.organization_id = o.id AND om.approval_status = 'approved'),
    (SELECT count(*) FROM public.clients c WHERE c.org_id = o.id),
    (SELECT count(*) FROM public.permits p WHERE p.org_id = o.id),
    (SELECT count(*) FROM public.trucks t WHERE t.org_id = o.id)
  FROM public.organizations o
  ORDER BY o.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_list_orgs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_list_orgs() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Details: the row from `organizations` + the member roster.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.super_admin_org_details(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org jsonb;
  v_members jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden: super-admin only';
  END IF;

  SELECT to_jsonb(o.*) INTO v_org
    FROM public.organizations o
   WHERE o.id = p_org_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'org not found';
  END IF;

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object(
      'user_id', om.user_id,
      'role', om.role,
      'approval_status', om.approval_status,
      'joined_at', om.joined_at,
      'email', p.email,
      'full_name', p.full_name
    ) ORDER BY om.joined_at ASC),
    '[]'::jsonb
  ) INTO v_members
    FROM public.organization_members om
    LEFT JOIN public.profiles p ON p.id = om.user_id
   WHERE om.organization_id = p_org_id;

  RETURN jsonb_build_object('org', v_org, 'members', v_members);
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_org_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_org_details(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Provisioning: create a new org. Slug must be unique; trim/lowercase
-- handled here so the caller doesn't need to remember.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.super_admin_create_org(
  p_slug text,
  p_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text := lower(trim(p_slug));
  v_id uuid;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden: super-admin only';
  END IF;

  IF v_slug IS NULL OR length(v_slug) < 2 THEN
    RAISE EXCEPTION 'slug must be at least 2 chars';
  END IF;
  IF v_slug !~ '^[a-z0-9][a-z0-9-]*$' THEN
    RAISE EXCEPTION 'slug must match ^[a-z0-9][a-z0-9-]*$';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name is required';
  END IF;

  INSERT INTO public.organizations (slug, name, subscription_status)
  VALUES (v_slug, trim(p_name), 'trialing')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_create_org(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_create_org(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Set owner: assign (or promote) a user by email as owner of an org.
-- Returns the user_id picked. Errors if the email has no auth.users row yet
-- (the user must sign up first; invitations flow comes later).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.super_admin_set_owner(
  p_org_id uuid,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden: super-admin only';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'no user with email %', p_email;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, approval_status)
  VALUES (p_org_id, v_user_id, 'owner', 'approved')
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = 'owner',
        approval_status = 'approved';

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_set_owner(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_set_owner(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) Patch update: branding / feature_flags / subscription_status / name.
-- Pass only the keys you want to change in p_patch. Slug is intentionally
-- not editable here — changing slugs breaks subdomain routing for any user
-- with the old URL bookmarked.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.super_admin_update_org(
  p_org_id uuid,
  p_patch jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_status text;
  v_branding jsonb;
  v_flags jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden: super-admin only';
  END IF;

  v_name     := NULLIF(p_patch ->> 'name', '');
  v_status   := NULLIF(p_patch ->> 'subscription_status', '');
  v_branding := CASE WHEN p_patch ? 'branding' THEN p_patch -> 'branding' ELSE NULL END;
  v_flags    := CASE WHEN p_patch ? 'feature_flags' THEN p_patch -> 'feature_flags' ELSE NULL END;

  UPDATE public.organizations o
     SET name = COALESCE(v_name, o.name),
         subscription_status = COALESCE(v_status, o.subscription_status),
         branding = COALESCE(v_branding, o.branding),
         feature_flags = COALESCE(v_flags, o.feature_flags),
         updated_at = now()
   WHERE o.id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'org not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_update_org(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_update_org(uuid, jsonb) TO authenticated;
