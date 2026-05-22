-- ============================================================================
-- Compliance risk scoring
--
-- A daily job computes a 0-100 *risk* score per client (higher = worse) by
-- aggregating signals that already live in the schema: permit/insurance
-- expirations, CSA BASIC scores over their intervention thresholds, unresolved
-- HOS violations, FMCSA status/safety drift, overdue invoices, and the
-- upcoming MCS-150 biennial. The compute-risk-scores Edge Function is the
-- single source of truth for the weighting; this table just stores the result.
--
-- This is a *forward-looking operational risk* lens, distinct from the
-- client-side `computeScorecard` (src/lib/scorecard.ts), which measures
-- master-data completeness. Both can coexist on a client page.
--
-- Tables:
--   - compliance_risk_scores: one row per client per day (append-only history
--     keyed by (client_id, scored_date)). `factors` keeps the structured
--     breakdown (factor code + count + points) so the UI renders the "why"
--     and the numbers stay reproducible.
--
-- View:
--   - latest_risk_scores: most recent row per client, security_invoker so the
--     underlying table RLS applies to the caller.
--
-- Scheduling:
--   - cron.schedule('compute-risk-scores-daily', '0 5 * * *', ...) — 05:00 UTC,
--     after the FMCSA monitor's Monday 04:00 run so a fresh snapshot feeds in.
--     Mirrors the check-permit-expirations / fmcsa-monitor pg_net pattern.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) compliance_risk_scores
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.compliance_risk_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scored_date date NOT NULL DEFAULT current_date,
  score integer NOT NULL,           -- 0-100, higher = more risk
  band text NOT NULL,               -- low | medium | high | critical
  factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_scores_client_date
  ON public.compliance_risk_scores(client_id, scored_date);
CREATE INDEX IF NOT EXISTS idx_risk_scores_org_id
  ON public.compliance_risk_scores(org_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_client_date_desc
  ON public.compliance_risk_scores(client_id, scored_date DESC);

ALTER TABLE public.compliance_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_risk_scores
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

-- Read-only for org members. Rows are produced by the Edge Function under the
-- service role, so there is intentionally no INSERT/UPDATE policy for
-- `authenticated` (same convention as fmcsa_snapshots).
DROP POLICY IF EXISTS "org members read risk scores" ON public.compliance_risk_scores;
CREATE POLICY "org members read risk scores"
  ON public.compliance_risk_scores FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- 2) latest_risk_scores view — newest snapshot per client
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.latest_risk_scores
WITH (security_invoker = true) AS
SELECT DISTINCT ON (client_id)
  id, org_id, client_id, scored_date, score, band, factors, computed_at
FROM public.compliance_risk_scores
ORDER BY client_id, scored_date DESC;

-- ---------------------------------------------------------------------------
-- 3) Cron job — daily invocation of the compute-risk-scores Edge Function
-- ---------------------------------------------------------------------------

DO $outer$
BEGIN
  -- Same guard as the other Edge-Function crons: skip silently in
  -- environments where the vault secrets aren't provisioned yet.
  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_functions_url')
     AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN

    BEGIN
      PERFORM cron.unschedule('compute-risk-scores-daily');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM cron.schedule(
      'compute-risk-scores-daily',
      '0 5 * * *',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_functions_url') || '/compute-risk-scores',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
          ),
          body := '{}'::jsonb
        );
      $job$
    );
  END IF;
END;
$outer$;
