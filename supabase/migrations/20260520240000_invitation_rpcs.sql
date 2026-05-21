-- ============================================================================
-- Member invitations
--
-- organization_invitations table already exists (Week 1). This migration
-- adds the RPC layer the frontend uses to drive the invite flow end-to-end:
--
--   invite_member(email, role)    - admin/owner creates an invitation row
--   peek_invitation(token)        - public lookup so /invite/<token> can
--                                   render the org/email before auth
--   accept_invitation(token)      - authenticated callers turn the
--                                   invitation into an approved membership
--   revoke_invitation(id)         - admin/owner cancels a pending invite
--
-- The invite link the owner shares is /invite/<token> on the operator's
-- root domain (or the tenant subdomain — both work since the page is
-- public). After login/signup, the frontend calls accept_invitation and
-- redirects into the new org.
--
-- Email delivery is intentionally out of scope here: invite_member only
-- creates the DB row. A separate edge function can hook this for automatic
-- email (next iteration). For now the owner copies the link from the UI
-- and sends it manually.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) invite_member: admin/owner only
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.invite_member(
  p_org_id uuid,
  p_email  text,
  p_role   public.org_role DEFAULT 'member'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email   text := lower(trim(p_email));
  v_uid     uuid := auth.uid();
  v_token   text;
  v_id      uuid;
  v_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'must be authenticated';
  END IF;

  -- Only owners/admins of the target org can invite. Reusing the helper
  -- keeps the rule consistent with the RLS policies on the table.
  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'forbidden: org admin role required';
  END IF;

  IF v_email IS NULL OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  -- Block inviting someone who's already an approved member. We don't
  -- block pending invitations to the same email — that lets an admin
  -- re-issue a fresh link without manually revoking the old one.
  IF EXISTS (
    SELECT 1
      FROM public.organization_members om
      JOIN auth.users u ON u.id = om.user_id
     WHERE om.organization_id = p_org_id
       AND lower(u.email) = v_email
       AND om.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'email already a member of this organization';
  END IF;

  -- Reuse the previous pending invitation for the same email if there is
  -- one; otherwise insert fresh. Keeps the table lean and matches user
  -- expectation ("I sent another invite, the old link should die").
  DELETE FROM public.organization_invitations
   WHERE organization_id = p_org_id
     AND lower(email) = v_email
     AND accepted_at IS NULL;

  INSERT INTO public.organization_invitations (organization_id, email, role, invited_by)
  VALUES (p_org_id, v_email, p_role, v_uid)
  RETURNING id, token, expires_at INTO v_id, v_token, v_expires;

  RETURN jsonb_build_object('id', v_id, 'token', v_token, 'expires_at', v_expires);
END;
$$;

REVOKE ALL ON FUNCTION public.invite_member(uuid, text, public.org_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_member(uuid, text, public.org_role) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) peek_invitation: public — renders the /invite/<token> landing pre-auth
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.peek_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
BEGIN
  SELECT i.id, i.email, i.role, i.expires_at, i.accepted_at,
         i.organization_id, o.name AS org_name, o.slug AS org_slug
    INTO v_inv
    FROM public.organization_invitations i
    JOIN public.organizations o ON o.id = i.organization_id
   WHERE i.token = p_token
   LIMIT 1;

  IF v_inv IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;
  IF v_inv.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'already_accepted');
  END IF;
  IF v_inv.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'email', v_inv.email,
    'role',  v_inv.role,
    'org_name', v_inv.org_name,
    'org_slug', v_inv.org_slug,
    'expires_at', v_inv.expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.peek_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_invitation(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) accept_invitation: caller must be authenticated; the email on their
-- auth.users row must match the invitation's email
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_user_mail text;
  v_inv       RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'must be authenticated';
  END IF;

  SELECT lower(email) INTO v_user_mail FROM auth.users WHERE id = v_uid;
  IF v_user_mail IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  SELECT i.* INTO v_inv
    FROM public.organization_invitations i
   WHERE i.token = p_token
   LIMIT 1;
  IF v_inv IS NULL THEN
    RAISE EXCEPTION 'invitation not found';
  END IF;
  IF v_inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'invitation already accepted';
  END IF;
  IF v_inv.expires_at < now() THEN
    RAISE EXCEPTION 'invitation expired';
  END IF;
  IF lower(v_inv.email) <> v_user_mail THEN
    RAISE EXCEPTION 'invitation is for a different email';
  END IF;

  -- Upsert membership: if a stale pending row exists from a previous
  -- "self-signed-up but never approved" attempt, promote it in place.
  INSERT INTO public.organization_members (organization_id, user_id, role, approval_status)
  VALUES (v_inv.organization_id, v_uid, v_inv.role, 'approved')
  ON CONFLICT (organization_id, user_id) DO UPDATE
     SET role = EXCLUDED.role,
         approval_status = 'approved';

  UPDATE public.organization_invitations
     SET accepted_at = now()
   WHERE id = v_inv.id;

  -- Switch the user into the org they just joined so the next page load
  -- lands them there. If they already have an active_org elsewhere we
  -- still override — the explicit invite acceptance is a clear signal.
  UPDATE public.profiles
     SET active_org_id = v_inv.organization_id,
         approval_status = 'approved'
   WHERE id = v_uid;

  RETURN v_inv.organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) revoke_invitation: admin/owner cancels a pending invite
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.revoke_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id
    FROM public.organization_invitations
   WHERE id = p_invitation_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'invitation not found';
  END IF;

  IF NOT public.is_org_admin(v_org_id) THEN
    RAISE EXCEPTION 'forbidden: org admin role required';
  END IF;

  DELETE FROM public.organization_invitations WHERE id = p_invitation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_invitation(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) list_org_members: profiles RLS prevents reading other users' rows
-- directly, so we expose a DEFINER projection of the join. Members of the
-- target org get back name+email+role+approval_status for their peers.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_org_members(p_org_id uuid)
RETURNS TABLE (
  user_id         uuid,
  role            public.org_role,
  approval_status text,
  joined_at       timestamptz,
  email           text,
  full_name       text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'forbidden: not a member of this organization';
  END IF;

  RETURN QUERY
    SELECT
      om.user_id,
      om.role,
      om.approval_status,
      om.joined_at,
      p.email,
      p.full_name
    FROM public.organization_members om
    LEFT JOIN public.profiles p ON p.id = om.user_id
    WHERE om.organization_id = p_org_id
    ORDER BY
      CASE om.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
      om.joined_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_org_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_org_members(uuid) TO authenticated;
