-- ============================================================================
-- Portal-user signup path + cleanup
--
-- `create-portal-user` calls `auth.admin.createUser`, which fires
-- handle_new_user. Without a dedicated branch, every portal account was
-- planted as a `pending` member of the MartinsAdviser default org (Path B),
-- polluting that tenant's /admin/users list with people who actually belong
-- to a *client* (via client_portal_users), not to any organization.
--
-- This migration:
--   1. Adds Path C to the trigger: when raw_user_meta_data carries
--      intent='portal-user', only the profile is created (approved, no
--      active_org_id). No organization_members row is written.
--   2. Backfills the existing damage: removes the stray pending memberships
--      and clears active_org_id on profiles that belong to portal users.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_org_id constant uuid := '00000000-0000-0000-0000-000000000001';
  v_intent  text := NEW.raw_user_meta_data->>'intent';
  v_slug    text := lower(trim(coalesce(NEW.raw_user_meta_data->>'slug', '')));
  v_name    text := trim(coalesce(NEW.raw_user_meta_data->>'org_name', ''));
  v_country text := upper(trim(coalesce(NEW.raw_user_meta_data->>'country', 'US')));
  v_org_id  uuid;
BEGIN
  -- --------------------------------------------------------------------
  -- Path A: self-serve "create my own org".
  -- --------------------------------------------------------------------
  IF v_intent = 'new-org' THEN
    IF v_slug = '' OR length(v_slug) < 2 OR v_slug !~ '^[a-z0-9][a-z0-9-]*$' THEN
      RAISE EXCEPTION 'invalid slug: %', v_slug;
    END IF;
    IF v_slug IN ('www','app','api','admin','status','martinsadviser') THEN
      RAISE EXCEPTION 'slug % is reserved', v_slug;
    END IF;
    IF v_name = '' THEN
      RAISE EXCEPTION 'org_name is required';
    END IF;
    IF v_country NOT IN ('US','BR','ES') THEN
      RAISE EXCEPTION 'country must be US, BR or ES';
    END IF;
    IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = v_slug) THEN
      RAISE EXCEPTION 'slug % is already taken', v_slug;
    END IF;

    INSERT INTO public.organizations (slug, name, subscription_status)
    VALUES (v_slug, v_name, 'trialing')
    RETURNING id INTO v_org_id;

    INSERT INTO public.profiles (id, email, full_name, approval_status, active_org_id)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'approved',
      v_org_id
    );

    INSERT INTO public.organization_members (organization_id, user_id, role, approval_status)
    VALUES (v_org_id, NEW.id, 'owner', 'approved');

    RETURN NEW;
  END IF;

  -- --------------------------------------------------------------------
  -- Path C: portal user (provisioned by create-portal-user edge function).
  -- The real link lives in client_portal_users(user_id, client_id, org_id);
  -- they must NOT appear in organization_members or any tenant will see
  -- them in /admin/users.
  -- --------------------------------------------------------------------
  IF v_intent = 'portal-user' THEN
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

  -- --------------------------------------------------------------------
  -- Path B (default): legacy single-tenant signup or invited-by-an-existing-org.
  -- --------------------------------------------------------------------
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
-- Backfill: remove stray pending memberships in the default org for users
-- that are actually portal users. Guarded by approval_status='pending' so
-- we never delete a real member who also happens to have portal access.
-- ---------------------------------------------------------------------------
DELETE FROM public.organization_members om
USING public.client_portal_users cpu
WHERE om.user_id = cpu.user_id
  AND om.organization_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND om.approval_status = 'pending';

UPDATE public.profiles p
SET approval_status = 'approved',
    active_org_id   = NULL
FROM public.client_portal_users cpu
WHERE p.id = cpu.user_id
  AND p.approval_status = 'pending'
  AND p.active_org_id = '00000000-0000-0000-0000-000000000001'::uuid;
