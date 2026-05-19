-- ============================================================================
-- Multi-tenancy: tasks, invoices
-- Phase 1, Week 2 (tables 6-7 of 20).
--
-- Both tables are independent (no parent-child within this batch) but
-- reference clients via client_id. Backfill uses the default org since
-- every row predates multi-tenancy.
--
-- Behavioral parity preserved.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) tasks
-- ---------------------------------------------------------------------------

ALTER TABLE public.tasks
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.tasks
  SET org_id = '00000000-0000-0000-0000-000000000001'
  WHERE org_id IS NULL;

ALTER TABLE public.tasks
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_tasks_org_id ON public.tasks(org_id);

DROP POLICY IF EXISTS "Users can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;

CREATE POLICY "org members read tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org members create tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND auth.uid() = user_id
  );

CREATE POLICY "org members update tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org members delete tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- 2) invoices
-- ---------------------------------------------------------------------------

ALTER TABLE public.invoices
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.invoices
  SET org_id = '00000000-0000-0000-0000-000000000001'
  WHERE org_id IS NULL;

ALTER TABLE public.invoices
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_invoices_org_id ON public.invoices(org_id);

DROP POLICY IF EXISTS "Users can view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete invoices" ON public.invoices;

CREATE POLICY "org members read invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org members create invoices"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND auth.uid() = user_id
  );

CREATE POLICY "org members update invoices"
  ON public.invoices FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org members delete invoices"
  ON public.invoices FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));
