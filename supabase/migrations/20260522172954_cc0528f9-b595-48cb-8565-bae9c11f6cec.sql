-- Migration 1: Compliance Risk Scores
CREATE TABLE IF NOT EXISTS public.compliance_risk_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scored_date date NOT NULL DEFAULT current_date,
  score integer NOT NULL,
  band text NOT NULL,
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

DROP POLICY IF EXISTS "org members read risk scores" ON public.compliance_risk_scores;
CREATE POLICY "org members read risk scores"
  ON public.compliance_risk_scores FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE OR REPLACE VIEW public.latest_risk_scores
WITH (security_invoker = true) AS
SELECT DISTINCT ON (client_id)
  id, org_id, client_id, scored_date, score, band, factors, computed_at
FROM public.compliance_risk_scores
ORDER BY client_id, scored_date DESC;

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_functions_url')
     AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN
    BEGIN
      PERFORM cron.unschedule('compute-risk-scores-daily');
    EXCEPTION WHEN OTHERS THEN NULL;
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

-- Migration 2: ELD Connections
CREATE TABLE IF NOT EXISTS public.eld_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('motive', 'samsara')),
  api_key text,
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_sync_at timestamptz,
  last_error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_eld_connections_org_id ON public.eld_connections(org_id);

ALTER TABLE public.eld_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eld_connections ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP POLICY IF EXISTS "org admins read eld_connections" ON public.eld_connections;
CREATE POLICY "org admins read eld_connections"
  ON public.eld_connections FOR SELECT TO authenticated
  USING (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "org admins insert eld_connections" ON public.eld_connections;
CREATE POLICY "org admins insert eld_connections"
  ON public.eld_connections FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "org admins update eld_connections" ON public.eld_connections;
CREATE POLICY "org admins update eld_connections"
  ON public.eld_connections FOR UPDATE TO authenticated
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "org admins delete eld_connections" ON public.eld_connections;
CREATE POLICY "org admins delete eld_connections"
  ON public.eld_connections FOR DELETE TO authenticated
  USING (public.is_org_admin(org_id));

DROP TRIGGER IF EXISTS update_eld_connections_updated_at ON public.eld_connections;
CREATE TRIGGER update_eld_connections_updated_at
  BEFORE UPDATE ON public.eld_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.eld_sync_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  hos_imported integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  message text
);

CREATE INDEX IF NOT EXISTS idx_eld_sync_log_org_started
  ON public.eld_sync_log(org_id, started_at DESC);

ALTER TABLE public.eld_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members read eld_sync_log" ON public.eld_sync_log;
CREATE POLICY "org members read eld_sync_log"
  ON public.eld_sync_log FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_functions_url')
     AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN
    BEGIN
      PERFORM cron.unschedule('eld-sync-6h');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'eld-sync-6h',
      '0 */6 * * *',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_functions_url') || '/eld-sync',
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