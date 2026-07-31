-- ---------------------------------------------------------------------------
-- AI daily briefing cache.
--
-- MyDesk already aggregates every signal that needs attention (expiring
-- permits, tasks due, failed messages, overdue invoices, risk-score jumps)
-- into a flat ActionItem list. What it cannot do is tell the operator what to
-- do FIRST and why — with 40 items on screen, everything looks equally urgent.
-- The briefing is that synthesis layer.
--
-- It is cached rather than generated per page load for two reasons: the same
-- user opens MyDesk many times a day, and an LLM call on every mount would be
-- both slow and expensive. The cache key is (user_id, briefing_date) plus a
-- hash of the signals — so the briefing is stable through the day but does
-- regenerate when the underlying picture actually changes (a permit gets
-- renewed, an invoice is paid).
--
-- Per user, not per org: MyDesk is scoped to what is assigned to the caller,
-- so two members of the same org legitimately get different briefings.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_briefings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_date date NOT NULL DEFAULT CURRENT_DATE,
  signals_hash  text NOT NULL,
  payload       jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- One briefing per user per day; the edge function upserts on this key when
-- the signals hash moves.
CREATE UNIQUE INDEX IF NOT EXISTS ai_briefings_user_date_key
  ON public.ai_briefings (user_id, briefing_date);

CREATE INDEX IF NOT EXISTS idx_ai_briefings_org ON public.ai_briefings (org_id);

GRANT SELECT ON public.ai_briefings TO authenticated;
GRANT ALL ON public.ai_briefings TO service_role;

ALTER TABLE public.ai_briefings ENABLE ROW LEVEL SECURITY;

-- Read-only for the owner. Writes go exclusively through the edge function on
-- the service-role client — same shape as compliance_task_log. No authenticated
-- INSERT/UPDATE policy on purpose: the payload is model output the user must
-- not be able to forge, and the cache key is what bounds LLM spend.
DROP POLICY IF EXISTS "users read own briefings" ON public.ai_briefings;
CREATE POLICY "users read own briefings"
  ON public.ai_briefings FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- Retention: the briefing is worthless the day after it was written, and this
-- table would otherwise grow by one row per user per day forever. Prune to 30
-- days so the audit trail survives a "why did it tell me that?" question
-- without accumulating indefinitely.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prune_ai_briefings()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.ai_briefings WHERE briefing_date < CURRENT_DATE - 30;
$$;

REVOKE ALL ON FUNCTION public.prune_ai_briefings() FROM PUBLIC;

DO $$
BEGIN
  PERFORM cron.unschedule('prune-ai-briefings-daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-ai-briefings-daily');

  PERFORM cron.schedule(
    'prune-ai-briefings-daily',
    '20 4 * * *',
    $job$ SELECT public.prune_ai_briefings(); $job$
  );
END
$$;
