-- ============================================================================
-- Multi-tenancy: trucks, permits, permit_history, permit_documents
-- Phase 1, Week 2 (tables 2-5 of 21).
--
-- Order matters: permits is migrated before its child tables so that
-- permit_history and permit_documents can backfill org_id via JOIN.
--
-- Behavioral parity preserved: any org member can read/write rows of their
-- own org. Portal user access to trucks/permits is preserved.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) trucks (independent of permits)
-- ---------------------------------------------------------------------------

ALTER TABLE public.trucks
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.trucks
  SET org_id = '00000000-0000-0000-0000-000000000001'
  WHERE org_id IS NULL;

ALTER TABLE public.trucks
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_trucks_org_id ON public.trucks(org_id);

DROP POLICY IF EXISTS "Authenticated users can view all trucks" ON public.trucks;
DROP POLICY IF EXISTS "Authenticated users can create trucks" ON public.trucks;
DROP POLICY IF EXISTS "Authenticated users can update trucks" ON public.trucks;
DROP POLICY IF EXISTS "Authenticated users can delete trucks" ON public.trucks;
DROP POLICY IF EXISTS "Portal users can view their trucks" ON public.trucks;

CREATE POLICY "org members read trucks"
  ON public.trucks FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org members create trucks"
  ON public.trucks FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND auth.uid() = user_id
  );

CREATE POLICY "org members update trucks"
  ON public.trucks FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org members delete trucks"
  ON public.trucks FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "Portal users can view their trucks"
  ON public.trucks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_users
      WHERE client_portal_users.client_id = trucks.client_id
        AND client_portal_users.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2) permits (parent of permit_history, permit_documents)
-- ---------------------------------------------------------------------------

ALTER TABLE public.permits
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.permits
  SET org_id = '00000000-0000-0000-0000-000000000001'
  WHERE org_id IS NULL;

ALTER TABLE public.permits
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_permits_org_id ON public.permits(org_id);

DROP POLICY IF EXISTS "Authenticated users can view all permits" ON public.permits;
DROP POLICY IF EXISTS "Authenticated users can create permits" ON public.permits;
DROP POLICY IF EXISTS "Authenticated users can update permits" ON public.permits;
DROP POLICY IF EXISTS "Authenticated users can delete permits" ON public.permits;
DROP POLICY IF EXISTS "Portal users can view their permits" ON public.permits;

CREATE POLICY "org members read permits"
  ON public.permits FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org members create permits"
  ON public.permits FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND auth.uid() = user_id
  );

CREATE POLICY "org members update permits"
  ON public.permits FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org members delete permits"
  ON public.permits FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "Portal users can view their permits"
  ON public.permits FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_users
      WHERE client_portal_users.client_id = permits.client_id
        AND client_portal_users.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3) permit_history (child of permits) -- backfill via JOIN
-- ---------------------------------------------------------------------------

ALTER TABLE public.permit_history
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.permit_history ph
  SET org_id = p.org_id
  FROM public.permits p
  WHERE ph.permit_id = p.id AND ph.org_id IS NULL;

ALTER TABLE public.permit_history
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_permit_history_org_id ON public.permit_history(org_id);

DROP POLICY IF EXISTS "Authenticated users can view permit history" ON public.permit_history;
DROP POLICY IF EXISTS "Authenticated users can insert permit history" ON public.permit_history;

CREATE POLICY "org members read permit history"
  ON public.permit_history FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org members insert permit history"
  ON public.permit_history FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND auth.uid() = changed_by
  );

-- ---------------------------------------------------------------------------
-- 4) permit_documents (child of permits) -- backfill via JOIN
-- ---------------------------------------------------------------------------

ALTER TABLE public.permit_documents
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.permit_documents pd
  SET org_id = p.org_id
  FROM public.permits p
  WHERE pd.permit_id = p.id AND pd.org_id IS NULL;

ALTER TABLE public.permit_documents
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_permit_documents_org_id ON public.permit_documents(org_id);

DROP POLICY IF EXISTS "Users can view permit documents" ON public.permit_documents;
DROP POLICY IF EXISTS "Users can insert permit documents" ON public.permit_documents;
DROP POLICY IF EXISTS "Users can update permit documents" ON public.permit_documents;
DROP POLICY IF EXISTS "Users can delete permit documents" ON public.permit_documents;

CREATE POLICY "org members read permit documents"
  ON public.permit_documents FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org members insert permit documents"
  ON public.permit_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org members update permit documents"
  ON public.permit_documents FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org members delete permit documents"
  ON public.permit_documents FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));
