-- ============================================================================
-- Cross-tenant leak fix: org-scope the "admin" policies on profiles & user_roles
--
-- PROBLEM: profiles and user_roles carry policies guarded by the LEGACY GLOBAL
-- role check `has_role(auth.uid(), 'admin')`. Because that role is not
-- org-scoped, any user holding the global 'admin' role could SELECT/UPDATE/
-- DELETE *every* profile and role row in the database — i.e. users from other
-- tenants leaked into the Workload assignee lists and the Users admin screen.
--
-- FIX: replace the global check with `can_admin_user(target)`, which is true
-- only when the caller is an owner/admin of an organization that the target
-- user is also a member of. Reading/managing is thus confined to your own
-- org(s). "Users can read/insert own ..." policies are left untouched, so a
-- user can still see themselves; the JWT-hook and SECURITY DEFINER RPCs
-- (list_org_members, super-admin RPCs) are unaffected.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Helper: caller is owner/admin of an org the target user belongs to
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_admin_user(_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members me
    JOIN public.organization_members them
      ON them.organization_id = me.organization_id
    WHERE me.user_id = auth.uid()
      AND me.approval_status = 'approved'
      AND me.role IN ('owner', 'admin')
      AND them.user_id = _target
  );
$$;

REVOKE ALL ON FUNCTION public.can_admin_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_admin_user(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) profiles — replace global-admin policies with org-scoped ones
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.can_admin_user(id));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.can_admin_user(id))
  WITH CHECK (public.can_admin_user(id));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.can_admin_user(id));

-- ---------------------------------------------------------------------------
-- 3) user_roles — same treatment, keyed on the role row's user_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.can_admin_user(user_id));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.can_admin_user(user_id));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.can_admin_user(user_id))
  WITH CHECK (public.can_admin_user(user_id));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.can_admin_user(user_id));
