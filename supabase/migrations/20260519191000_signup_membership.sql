-- ============================================================================
-- Signup auto-membership: new users join the default org as pending members
-- Phase 1, Week 3.
--
-- The existing handle_new_user() trigger only creates a profile. For
-- multi-tenancy, new signups also need an organization_members row, or
-- they will be unable to access anything once approved (no membership =
-- empty RLS results).
--
-- In Phase 1 (single-tenant), every new signup is implicitly for the
-- MartinsAdviser org. profiles.active_org_id is also seeded so the
-- OrgContext resolves on first login. In Phase 2 (multi-tenant signup),
-- this trigger must be replaced by a signup flow that asks the user to
-- create an org or accept an invite — the hardcoded UUID becomes wrong.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_org_id constant uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
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
