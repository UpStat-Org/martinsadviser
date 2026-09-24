-- 20260728130000_org_hourly_rate_rpc.sql
CREATE OR REPLACE FUNCTION public.update_org_hourly_rate(p_org_id uuid, p_rate numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Not authorized to edit the hourly rate for this organization';
  END IF;

  IF p_rate IS NULL OR p_rate < 0 THEN
    RAISE EXCEPTION 'Hourly rate must be zero or greater';
  END IF;

  UPDATE public.organizations
     SET default_hourly_rate = p_rate
   WHERE id = p_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_org_hourly_rate(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_org_hourly_rate(uuid, numeric) TO authenticated;

-- 20260731170000_ai_daily_briefing.sql
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

CREATE UNIQUE INDEX IF NOT EXISTS ai_briefings_user_date_key
  ON public.ai_briefings (user_id, briefing_date);

CREATE INDEX IF NOT EXISTS idx_ai_briefings_org ON public.ai_briefings (org_id);

GRANT SELECT ON public.ai_briefings TO authenticated;
GRANT ALL ON public.ai_briefings TO service_role;

ALTER TABLE public.ai_briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own briefings" ON public.ai_briefings;
CREATE POLICY "users read own briefings"
  ON public.ai_briefings FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_org_member(org_id));

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