-- ============================================================================
-- Self-serve onboarding
--
-- Two changes that work together:
--
-- 1) handle_new_user becomes intent-aware. The signup form for "create a
--    new organization" sets raw_user_meta_data.intent='new-org' so the
--    trigger skips the default MartinsAdviser membership — that user is
--    going to bootstrap their own org via public_create_org_with_owner()
--    right after signup. Existing single-tenant signups (no intent) keep
--    the old behavior: pending membership in cliente 0.
--
-- 2) public_create_org_with_owner is the RPC the /start page calls right
--    after auth.signUp() resolves. SECURITY DEFINER so it can write to
--    organizations/organization_members/profiles without depending on
--    membership policies that don't apply yet. Slug + name validation
--    matches super_admin_create_org so the rules stay consistent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Intent-aware handle_new_user
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_org_id constant uuid := '00000000-0000-0000-0000-000000000001';
  v_intent text := NEW.raw_user_meta_data->>'intent';
BEGIN
  -- For "new-org" signups, just create the profile and let the client side
  -- call public_create_org_with_owner() — we don't know the slug yet, and
  -- we definitely don't want them sitting as a pending MartinsAdviser
  -- member.
  IF v_intent = 'new-org' THEN
    INSERT INTO public.profiles (id, email, full_name, approval_status, active_org_id)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'approved',
      NULL
    );
    RETURN NEW;
  END IF;

  -- Default path: legacy single-tenant or invited-by-org signups. Land as
  -- a pending member of cliente 0; admins approve from /admin/users.
  INSERT INTO public.profiles (id, email, full_name, approval_status, active_org_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'pending',
    default_org_id
  );

  INSERT INTO public.organization_members (organization_id, user_id, role, approval_status)
  VALUES (default_org_id, NEW.id, 'member', 'pending')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) public_create_org_with_owner RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_create_org_with_owner(
  p_slug text,
  p_name text,
  p_country text DEFAULT 'US'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_slug text := lower(trim(p_slug));
  v_name text := trim(p_name);
  v_org_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'must be authenticated';
  END IF;

  -- Same validation rules as super_admin_create_org so a slug that passes
  -- here won't be rejected later by an admin tool.
  IF v_slug IS NULL OR length(v_slug) < 2 THEN
    RAISE EXCEPTION 'slug must be at least 2 chars';
  END IF;
  IF v_slug !~ '^[a-z0-9][a-z0-9-]*$' THEN
    RAISE EXCEPTION 'slug must match ^[a-z0-9][a-z0-9-]*$';
  END IF;
  IF v_slug IN ('www', 'app', 'api', 'admin', 'status', 'martinsadviser') THEN
    RAISE EXCEPTION 'slug % is reserved', v_slug;
  END IF;
  IF v_name IS NULL OR length(v_name) = 0 THEN
    RAISE EXCEPTION 'name is required';
  END IF;
  IF p_country NOT IN ('US', 'BR', 'ES') THEN
    RAISE EXCEPTION 'country must be US, BR or ES';
  END IF;

  -- The caller must not already own another org. Lets us keep the contract
  -- "one user signs up → one org" simple; secondary org adoption happens
  -- through invitations (separate flow).
  IF EXISTS (
    SELECT 1 FROM public.organization_members
     WHERE user_id = v_uid AND role = 'owner' AND approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'caller is already an owner of an organization';
  END IF;

  INSERT INTO public.organizations (slug, name, subscription_status)
  VALUES (v_slug, v_name, 'trialing')
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role, approval_status)
  VALUES (v_org_id, v_uid, 'owner', 'approved');

  UPDATE public.profiles
     SET active_org_id = v_org_id,
         approval_status = 'approved'
   WHERE id = v_uid;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.public_create_org_with_owner(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_create_org_with_owner(text, text, text) TO authenticated;
