-- ============================================================================
-- ELD integration scaffold (Motive / Samsara)
--
-- Stores one connection per org per provider plus a sync audit log. The
-- eld-sync Edge Function reads connected rows and pulls HOS logs (and, later,
-- DVIR/maintenance and IFTA mileage) into the existing tables — hos_violations
-- already carries the `eld_motive` / `eld_samsara` source values.
--
-- SECURITY NOTE: api credentials are stored in `api_key` for the scaffold so
-- the flow is end-to-end testable. Before going live, move secrets to Supabase
-- Vault and keep only a reference here. The frontend hook never SELECTs
-- api_key, and RLS limits the whole row to org admins.
--
-- Scheduling: cron 'eld-sync-6h' invokes eld-sync every 6 hours, guarded by
-- the same vault-secret check as the other Edge-Function crons.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) eld_connections
-- ---------------------------------------------------------------------------

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

-- Only org admins can see or manage ELD credentials.
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

-- ---------------------------------------------------------------------------
-- 2) eld_sync_log — audit of each sync run
-- ---------------------------------------------------------------------------

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

-- Rows are written by the Edge Function under the service role — no
-- authenticated INSERT/UPDATE policy.

-- ---------------------------------------------------------------------------
-- 3) Cron job — sync every 6 hours
-- ---------------------------------------------------------------------------

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_functions_url')
     AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN

    BEGIN
      PERFORM cron.unschedule('eld-sync-6h');
    EXCEPTION WHEN OTHERS THEN
      NULL;
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
