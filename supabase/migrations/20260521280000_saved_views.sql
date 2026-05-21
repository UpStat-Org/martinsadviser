-- ============================================================================
-- Saved filter views
--
-- A user-saved snapshot of filter state for a list page (clients, permits,
-- trucks, tasks, invoices…). Each row stores the page identifier (`scope`),
-- a name and a jsonb blob of filters that the page knows how to apply.
--
-- `shared = true` makes the view visible to other org members; otherwise
-- only the creator sees it.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.saved_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('clients', 'permits', 'trucks', 'tasks', 'invoices')),
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_org_scope ON public.saved_views(org_id, scope);
CREATE INDEX IF NOT EXISTS idx_saved_views_user_id ON public.saved_views(user_id);

ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_views ALTER COLUMN org_id SET DEFAULT public.current_org_id();

-- Read: the owner always, plus any org member when shared.
DROP POLICY IF EXISTS "saved views read" ON public.saved_views;
CREATE POLICY "saved views read" ON public.saved_views FOR SELECT TO authenticated
  USING (
    public.is_org_member(org_id)
    AND (auth.uid() = user_id OR shared = true)
  );

DROP POLICY IF EXISTS "saved views insert" ON public.saved_views;
CREATE POLICY "saved views insert" ON public.saved_views FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "saved views update" ON public.saved_views;
CREATE POLICY "saved views update" ON public.saved_views FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND auth.uid() = user_id)
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "saved views delete" ON public.saved_views;
CREATE POLICY "saved views delete" ON public.saved_views FOR DELETE TO authenticated
  USING (public.is_org_member(org_id) AND auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_saved_views_updated_at ON public.saved_views;
CREATE TRIGGER update_saved_views_updated_at BEFORE UPDATE ON public.saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
