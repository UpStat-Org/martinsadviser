-- ============================================================================
-- Time tracking + profit-per-client
--
-- Each log entry attaches minutes to a task. The agency configures a default
-- hourly rate per org (in organizations.default_hourly_rate). Profit per
-- client = paid invoice total − sum(time_entries × rate) for that client.
--
-- We don't enforce billable status — every entry counts. If the agency
-- wants non-billable categories later, add a `billable boolean` column.
-- ============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_hourly_rate numeric(12, 2) NOT NULL DEFAULT 50.00;

COMMENT ON COLUMN public.organizations.default_hourly_rate IS
  'Hourly cost used for profit-per-client calculations. Defaults to $50/hr. Override here changes the calc for all historical entries.';

CREATE TABLE IF NOT EXISTS public.task_time_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  minutes integer NOT NULL CHECK (minutes > 0),
  note text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_task ON public.task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_client ON public.task_time_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_id ON public.task_time_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.task_time_entries(user_id);

ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_entries ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP POLICY IF EXISTS "time entries read" ON public.task_time_entries;
CREATE POLICY "time entries read" ON public.task_time_entries FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "time entries insert" ON public.task_time_entries;
CREATE POLICY "time entries insert" ON public.task_time_entries FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "time entries update" ON public.task_time_entries;
CREATE POLICY "time entries update" ON public.task_time_entries FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND auth.uid() = user_id)
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "time entries delete" ON public.task_time_entries;
CREATE POLICY "time entries delete" ON public.task_time_entries FOR DELETE TO authenticated
  USING (public.is_org_member(org_id) AND auth.uid() = user_id);
