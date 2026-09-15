-- Organization-scoped authorization.
--
-- owner/admin/operator/member may write operational data. A viewer is truly
-- read-only at the database boundary; hiding buttons in React is not treated
-- as authorization. Personal, non-business state (saved views/filters,
-- notifications and AI chat history) remains writable by its existing
-- user_id-scoped policies.

CREATE OR REPLACE FUNCTION public.can_org_write(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.organization_members om
     WHERE om.organization_id = _org_id
       AND om.user_id = auth.uid()
       AND om.approval_status = 'approved'
       AND om.role IN (
         'owner'::public.org_role,
         'admin'::public.org_role,
         'operator'::public.org_role,
         'member'::public.org_role
       )
  );
$$;

REVOKE ALL ON FUNCTION public.can_org_write(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_org_write(uuid) TO authenticated;

-- Existing membership policies allow admins to manage members. Keep that
-- operational capability, but make owner creation/demotion owner-only.
-- RESTRICTIVE policies are ANDed with the existing membership policies.
DROP POLICY IF EXISTS "owners control owner invitations" ON public.organization_invitations;
CREATE POLICY "owners control owner invitations"
  ON public.organization_invitations AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    role <> 'owner'::public.org_role
    OR public.has_org_role(organization_id, 'owner'::public.org_role)
  );

DROP POLICY IF EXISTS "owners control owner membership inserts" ON public.organization_members;
CREATE POLICY "owners control owner membership inserts"
  ON public.organization_members AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    role <> 'owner'::public.org_role
    OR public.has_org_role(organization_id, 'owner'::public.org_role)
  );

DROP POLICY IF EXISTS "owners control owner membership updates" ON public.organization_members;
CREATE POLICY "owners control owner membership updates"
  ON public.organization_members AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (
    role <> 'owner'::public.org_role
    OR public.has_org_role(organization_id, 'owner'::public.org_role)
  )
  WITH CHECK (
    role <> 'owner'::public.org_role
    OR public.has_org_role(organization_id, 'owner'::public.org_role)
  );

DROP POLICY IF EXISTS "owners control owner membership deletes" ON public.organization_members;
CREATE POLICY "owners control owner membership deletes"
  ON public.organization_members AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (
    role <> 'owner'::public.org_role
    OR public.has_org_role(organization_id, 'owner'::public.org_role)
  );

-- Preserve the roles users already have while moving the source of truth from
-- the global user_roles row to each organization membership. Owners are never
-- overwritten by the backfill.
UPDATE public.organization_members om
   SET role = CASE legacy.role
     WHEN 'admin'    THEN 'admin'::public.org_role
     WHEN 'operator' THEN 'operator'::public.org_role
     WHEN 'viewer'   THEN 'viewer'::public.org_role
     ELSE om.role
   END
  FROM public.profiles p,
       LATERAL (
         SELECT ur.role::text AS role
           FROM public.user_roles ur
          WHERE ur.user_id = p.id
            AND ur.role::text IN ('admin', 'operator', 'viewer')
          ORDER BY CASE ur.role::text
            WHEN 'admin' THEN 0 WHEN 'operator' THEN 1 ELSE 2
          END
          LIMIT 1
       ) legacy
 WHERE p.id = om.user_id
   AND p.active_org_id = om.organization_id
   AND om.role = 'member'::public.org_role;

-- Add restrictive write policies to every RLS-enabled org-owned table. These
-- policies do not grant access by themselves; they are ANDed with the existing
-- permissive policies (membership, ownership, user_id, admin checks, etc.).
DO $$
DECLARE
  row record;
BEGIN
  FOR row IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relrowsecurity
       AND a.attname = 'org_id'
       AND NOT a.attisdropped
       AND c.relname NOT IN (
         'notifications',
         'saved_filters',
         'saved_views',
         'ai_chat_messages'
       )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "org writers only insert" ON %I.%I',
      row.schema_name, row.table_name
    );
    EXECUTE format(
      'CREATE POLICY "org writers only insert" ON %I.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(org_id))',
      row.schema_name, row.table_name
    );

    EXECUTE format(
      'DROP POLICY IF EXISTS "org writers only update" ON %I.%I',
      row.schema_name, row.table_name
    );
    EXECUTE format(
      'CREATE POLICY "org writers only update" ON %I.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(org_id)) WITH CHECK (public.can_org_write(org_id))',
      row.schema_name, row.table_name
    );

    EXECUTE format(
      'DROP POLICY IF EXISTS "org writers only delete" ON %I.%I',
      row.schema_name, row.table_name
    );
    EXECUTE format(
      'CREATE POLICY "org writers only delete" ON %I.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.can_org_write(org_id))',
      row.schema_name, row.table_name
    );
  END LOOP;
END;
$$;

-- Permit documents live in storage.objects rather than public tables. Keep
-- the existing permissive bucket policies, but require a writable role for
-- inserts, updates, and deletes in the org-scoped permit bucket.
DROP POLICY IF EXISTS "org writers only upload permit documents" ON storage.objects;
CREATE POLICY "org writers only upload permit documents"
  ON storage.objects AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id <> 'permit-documents'
    OR public.can_org_write((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "org writers only update permit documents" ON storage.objects;
CREATE POLICY "org writers only update permit documents"
  ON storage.objects AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (
    bucket_id <> 'permit-documents'
    OR public.can_org_write((storage.foldername(name))[1]::uuid)
  )
  WITH CHECK (
    bucket_id <> 'permit-documents'
    OR public.can_org_write((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "org writers only delete permit documents" ON storage.objects;
CREATE POLICY "org writers only delete permit documents"
  ON storage.objects AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (
    bucket_id <> 'permit-documents'
    OR public.can_org_write((storage.foldername(name))[1]::uuid)
  );

-- The admin directory contains emails and role controls, so ordinary members
-- should not be able to call its SECURITY DEFINER projection directly.
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
  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'forbidden: organization admin required';
  END IF;

  RETURN QUERY
    SELECT om.user_id, om.role, om.approval_status, om.joined_at,
           p.email, p.full_name
      FROM public.organization_members om
      LEFT JOIN public.profiles p ON p.id = om.user_id
     WHERE om.organization_id = p_org_id
     ORDER BY
       CASE om.role
         WHEN 'owner'::public.org_role THEN 0
         WHEN 'admin'::public.org_role THEN 1
         WHEN 'operator'::public.org_role THEN 2
         WHEN 'member'::public.org_role THEN 3
         WHEN 'viewer'::public.org_role THEN 4
         ELSE 5
       END,
       om.joined_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_org_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_org_members(uuid) TO authenticated;

-- SECURITY DEFINER invitation RPCs bypass table RLS, so enforce the owner
-- boundary inside the function too. Never let an admin create an owner invite.
CREATE OR REPLACE FUNCTION public.invite_member(
  p_org_id uuid,
  p_email text,
  p_role public.org_role DEFAULT 'member'::public.org_role
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
  IF v_uid IS NULL THEN RAISE EXCEPTION 'must be authenticated'; END IF;
  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'forbidden: org admin role required';
  END IF;
  IF p_role = 'owner'::public.org_role
     AND NOT public.has_org_role(p_org_id, 'owner'::public.org_role) THEN
    RAISE EXCEPTION 'forbidden: owner role required to invite another owner';
  END IF;
  IF v_email IS NULL OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.organization_members om
      JOIN auth.users u ON u.id = om.user_id
     WHERE om.organization_id = p_org_id
       AND lower(u.email) = v_email
       AND om.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'email already a member of this organization';
  END IF;

  DELETE FROM public.organization_invitations
   WHERE organization_id = p_org_id
     AND lower(email) = v_email
     AND accepted_at IS NULL;

  INSERT INTO public.organization_invitations
    (organization_id, email, role, invited_by)
  VALUES (p_org_id, v_email, p_role, v_uid)
  RETURNING id, token, expires_at INTO v_id, v_token, v_expires;

  RETURN jsonb_build_object('id', v_id, 'token', v_token, 'expires_at', v_expires);
END;
$$;

REVOKE ALL ON FUNCTION public.invite_member(uuid, text, public.org_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_member(uuid, text, public.org_role) TO authenticated;

-- Existing owner invitations created before this hardening are also checked
-- at redemption, so an old admin-issued owner link cannot escalate privilege.
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user_mail text;
  v_inv record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'must be authenticated'; END IF;
  SELECT lower(email) INTO v_user_mail FROM auth.users WHERE id = v_uid;
  IF v_user_mail IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  SELECT i.* INTO v_inv
    FROM public.organization_invitations i
   WHERE i.token = p_token
   LIMIT 1;
  IF v_inv IS NULL THEN RAISE EXCEPTION 'invitation not found'; END IF;
  IF v_inv.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'invitation already accepted'; END IF;
  IF v_inv.expires_at < now() THEN RAISE EXCEPTION 'invitation expired'; END IF;
  IF lower(v_inv.email) <> v_user_mail THEN
    RAISE EXCEPTION 'invitation is for a different email';
  END IF;
  IF v_inv.role = 'owner'::public.org_role AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om
     WHERE om.organization_id = v_inv.organization_id
       AND om.user_id = v_inv.invited_by
       AND om.role = 'owner'::public.org_role
       AND om.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'owner invitation requires an approved owner inviter';
  END IF;

  INSERT INTO public.organization_members
    (organization_id, user_id, role, approval_status)
  VALUES (v_inv.organization_id, v_uid, v_inv.role, 'approved')
  ON CONFLICT (organization_id, user_id) DO UPDATE
     SET role = EXCLUDED.role, approval_status = 'approved';

  UPDATE public.organization_invitations
     SET accepted_at = now()
   WHERE id = v_inv.id;

  UPDATE public.profiles
     SET active_org_id = v_inv.organization_id,
         approval_status = 'approved'
   WHERE id = v_uid;

  RETURN v_inv.organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;
