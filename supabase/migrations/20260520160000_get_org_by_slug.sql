-- ============================================================================
-- Public RPC: get_org_by_slug
--
-- Resolves the public-safe slice of an organization from its slug. This is
-- called pre-authentication by the Login page on a tenant subdomain to
-- render the org's branding (logo + name) before the user types credentials.
--
-- Exposes ONLY public-safe fields:
--   - id            (used to scope post-login membership check)
--   - slug
--   - name
--   - branding      (the same jsonb shown in the sidebar; intentionally public)
--
-- Withheld (sensitive / business-internal):
--   - feature_flags       (plan composition)
--   - subscription_status (billing state)
--
-- Why a SECURITY DEFINER function instead of a SELECT policy on organizations:
--   - the organizations table's RLS is membership-based (is_org_member) which
--     anon callers cannot satisfy. Adding a permissive "anyone can read by
--     slug" policy would leak the full row including feature_flags. Wrapping
--     the column projection in a definer function lets us hand out exactly
--     the fields we want without relaxing table RLS.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_org_by_slug(p_slug text)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  branding jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.slug, o.name, o.branding
    FROM public.organizations o
   WHERE o.slug = p_slug
   LIMIT 1;
$$;

-- Restrict the implicit grant from PUBLIC, then hand out exactly the roles
-- we need. anon = pre-login users; authenticated = users that already have
-- a session (e.g. switching subdomain in the same browser).
REVOKE ALL ON FUNCTION public.get_org_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_by_slug(text) TO anon, authenticated;
