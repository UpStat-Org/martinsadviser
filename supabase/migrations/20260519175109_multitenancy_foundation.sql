-- ============================================================================
-- Multi-tenancy foundation
-- Phase 1, Week 1: organizations, memberships, invitations + security-definer
-- helpers. Existing tables are NOT touched here; org_id columns and policy
-- rewrites land in subsequent migrations (Week 2).
--
-- Backfill: a default "MartinsAdviser" organization is created with a fixed
-- UUID, and every existing profile becomes a member (admins become owners,
-- preserving approval_status from profiles).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name text NOT NULL,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  subscription_status text NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'member',
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);

CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_organization_invitations_org_id ON public.organization_invitations(organization_id);
CREATE INDEX idx_organization_invitations_email ON public.organization_invitations(lower(email));

-- ---------------------------------------------------------------------------
-- Security-definer helpers
--
-- current_org_id() resolves the active org for the request. It prefers a
-- JWT custom claim (set by the Custom Access Token Hook, configured in
-- Week 3); during the transition it falls back to the first approved
-- membership of the calling user. The fallback keeps the legacy frontend
-- working while we ship the OrgContext.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id', '')::uuid,
    (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid() AND approval_status = 'approved'
      ORDER BY joined_at ASC
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND approval_status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org_id uuid, _role public.org_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND approval_status = 'approved'
      AND role = _role
  );
$$;

-- Convenience: owner OR admin (most "manage" policies want either)
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND approval_status = 'approved'
      AND role IN ('owner', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS for the tenancy tables themselves
-- ---------------------------------------------------------------------------

-- organizations
CREATE POLICY "org members read their organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));

CREATE POLICY "org owners update their organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_org_role(id, 'owner'))
  WITH CHECK (public.has_org_role(id, 'owner'));

-- INSERT/DELETE on organizations is intentionally not exposed via RLS; orgs
-- are created via signup flow (Week 3) using service_role.

-- organization_members
CREATE POLICY "members read members of same org"
  ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "admins insert members"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "admins update members"
  ON public.organization_members FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "admins delete members"
  ON public.organization_members FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY "users read own memberships"
  ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- organization_invitations
CREATE POLICY "admins read invitations"
  ON public.organization_invitations FOR SELECT TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY "admins create invitations"
  ON public.organization_invitations FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "admins delete invitations"
  ON public.organization_invitations FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Seed: MartinsAdviser organization + backfill memberships
--
-- The fixed UUID 00000000-0000-0000-0000-000000000001 is referenced from
-- subsequent migrations that backfill org_id on existing tables.
-- ---------------------------------------------------------------------------

INSERT INTO public.organizations (id, slug, name, subscription_status, feature_flags)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'martinsadviser',
  'MartinsAdviser',
  'active',
  jsonb_build_object(
    'permits', true,
    'trucks', true,
    'kanban', true,
    'ai', true,
    'portal', true,
    'calendar', true
  )
)
ON CONFLICT (id) DO NOTHING;

-- Every existing profile becomes a member of MartinsAdviser.
-- Admins (per legacy public.has_role) are promoted to owner; others are members.
-- approval_status is preserved from profiles so the existing approval gate keeps working.
INSERT INTO public.organization_members (organization_id, user_id, role, approval_status, joined_at)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  p.id,
  CASE WHEN public.has_role(p.id, 'admin'::public.app_role) THEN 'owner'::public.org_role
       ELSE 'member'::public.org_role END,
  p.approval_status,
  p.created_at
FROM public.profiles p
ON CONFLICT (organization_id, user_id) DO NOTHING;
