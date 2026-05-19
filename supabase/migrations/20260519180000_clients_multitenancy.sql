-- ============================================================================
-- Multi-tenancy: clients
-- Phase 1, Week 2 (table 1 of 21).
--
-- Adds org_id to public.clients, backfills with MartinsAdviser org, and
-- rewrites all RLS policies to scope by org membership. Portal user access
-- is preserved (cascades through client_portal_users which gets its own
-- org_id in a later migration; same-org invariant holds either way).
--
-- Behavioral parity with pre-migration state: any org member can SELECT/
-- INSERT/UPDATE/DELETE clients of their own org. Role-based tightening
-- (e.g., admin-only delete) is intentionally out of scope for Phase 1.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Schema change
-- ---------------------------------------------------------------------------

ALTER TABLE public.clients
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.clients
  SET org_id = '00000000-0000-0000-0000-000000000001'
  WHERE org_id IS NULL;

ALTER TABLE public.clients
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_clients_org_id ON public.clients(org_id);

-- ---------------------------------------------------------------------------
-- Policy rewrite
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can create clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Portal users can view their client" ON public.clients;

CREATE POLICY "org members read clients"
  ON public.clients FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org members create clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND auth.uid() = user_id
  );

CREATE POLICY "org members update clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org members delete clients"
  ON public.clients FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

-- Portal user access: a portal user (linked via client_portal_users) can read
-- their own client. The link table itself is org-scoped in a later migration,
-- which transitively guarantees the same-org invariant.
CREATE POLICY "Portal users can view their client"
  ON public.clients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_users
      WHERE client_portal_users.client_id = clients.id
        AND client_portal_users.user_id = auth.uid()
    )
  );
