-- ============================================================================
-- Self-serve signup v2: create the org inside handle_new_user
--
-- The previous version (20260520220000) needed two round trips: signUp →
-- get a session → call public_create_org_with_owner. That breaks the
-- moment the Supabase project requires email confirmation, because the
-- session doesn't materialize until the user clicks the link in their
-- inbox — and the /start page can't finish provisioning.
--
-- Fix: when raw_user_meta_data carries intent='new-org' along with slug,
-- name and country, the trigger itself provisions the org + owner
-- membership + active_org_id. Email confirmation no longer blocks the
-- flow; the user just confirms whenever they want and finds their org
-- already waiting for them on first login.
--
-- We keep public_create_org_with_owner around as a fallback for the
-- (eventual) "add a second org" flow, but the self-serve page no longer
-- needs to call it.
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
  -- Path A: self-serve "create my own org". All required fields validated
  -- inline so a malformed metadata payload fails the signup loudly instead
  -- of producing an orphan user.
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

    -- Profile is approved and points at the new org so OrgContext resolves
    -- the moment the user lands (even if they confirmed email weeks later).
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
  -- Path B (default): legacy single-tenant signup or invited-by-an-existing-org.
  -- Lands as a pending member of cliente 0; admins approve from /admin/users.
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
