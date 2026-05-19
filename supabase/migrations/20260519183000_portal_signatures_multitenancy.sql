-- ============================================================================
-- Multi-tenancy: client_portal_users, document_signatures
-- Phase 1, Week 2 (tables 8-9 of 20).
--
-- client_portal_users is the link table for the trucker portal; once it has
-- org_id, the "Portal users can view their client/trucks/permits" policies
-- written in earlier batches become transitively org-scoped (a portal user
-- can only be linked to a client of their org).
--
-- Notable change: the legacy "Admins can manage portal users" policy used
-- the global has_role(uid,'admin'). It is replaced by is_org_admin(org_id).
-- In single-org state this is equivalent (the legacy admin is now the
-- MartinsAdviser owner, which is_org_admin treats as admin), but the new
-- form scopes correctly under multi-tenancy.
--
-- document_signatures has no UPDATE policy today (signatures are immutable);
-- that omission is preserved.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) client_portal_users (backfill via JOIN to clients)
-- ---------------------------------------------------------------------------

ALTER TABLE public.client_portal_users
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.client_portal_users cpu
  SET org_id = c.org_id
  FROM public.clients c
  WHERE cpu.client_id = c.id AND cpu.org_id IS NULL;

ALTER TABLE public.client_portal_users
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_client_portal_users_org_id ON public.client_portal_users(org_id);

DROP POLICY IF EXISTS "Portal users can view own links" ON public.client_portal_users;
DROP POLICY IF EXISTS "Admins can manage portal users" ON public.client_portal_users;

-- Portal user reading their own link (used by the portal frontend to resolve
-- which client they have access to). Independent of org membership.
CREATE POLICY "Portal users can view own links"
  ON public.client_portal_users FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Org admins manage portal users within their own org.
CREATE POLICY "Org admins manage portal users"
  ON public.client_portal_users FOR ALL TO authenticated
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

-- ---------------------------------------------------------------------------
-- 2) document_signatures (backfill via JOIN to clients)
-- ---------------------------------------------------------------------------

ALTER TABLE public.document_signatures
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.document_signatures ds
  SET org_id = c.org_id
  FROM public.clients c
  WHERE ds.client_id = c.id AND ds.org_id IS NULL;

ALTER TABLE public.document_signatures
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_document_signatures_org_id ON public.document_signatures(org_id);

DROP POLICY IF EXISTS "Authenticated users can view signatures" ON public.document_signatures;
DROP POLICY IF EXISTS "Authenticated users can create signatures" ON public.document_signatures;
DROP POLICY IF EXISTS "Authenticated users can delete signatures" ON public.document_signatures;

CREATE POLICY "org members read signatures"
  ON public.document_signatures FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org members create signatures"
  ON public.document_signatures FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND auth.uid() = user_id
  );

CREATE POLICY "org members delete signatures"
  ON public.document_signatures FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));
