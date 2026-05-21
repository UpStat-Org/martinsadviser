-- ============================================================================
-- Task templates / workflows
--
-- An agency reuses the same N-step task workflows over and over: new client
-- onboarding, annual renewal, post-accident follow-up, etc. A template is a
-- saved list of task descriptors with relative dates. Applying it to a
-- client materialises N concrete tasks.
--
-- Each template item carries:
--   - name           — what the task is called
--   - task_type      — slot into the existing task_type pattern (free string)
--   - days_offset    — relative due date from the apply-date (can be negative)
--   - priority       — low / medium / high (matches existing tasks column)
--   - notes          — optional preset note
--
-- Stored as a jsonb array on the template row.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_templates_org_id ON public.task_templates(org_id);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP POLICY IF EXISTS "task_templates read" ON public.task_templates;
CREATE POLICY "task_templates read" ON public.task_templates FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "task_templates insert" ON public.task_templates;
CREATE POLICY "task_templates insert" ON public.task_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "task_templates update" ON public.task_templates;
CREATE POLICY "task_templates update" ON public.task_templates FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "task_templates delete" ON public.task_templates;
CREATE POLICY "task_templates delete" ON public.task_templates FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_task_templates_updated_at ON public.task_templates;
CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
