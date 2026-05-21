-- ============================================================================
-- FMCSA continuous monitoring
--
-- A weekly job polls FMCSA QC for every client that has a DOT number, stores
-- a snapshot of the carrier record, and emits a `fmcsa_change` notification
-- when safety_rating or status_code drifts from the previous snapshot.
--
-- Tables:
--   - fmcsa_snapshots: append-only history of carrier data per client. Keeps
--     enough fields to power the compliance score and the change-detection
--     comparator; the full API payload is kept in `raw` for forensics.
--
-- Notifications:
--   - Reuses public.notifications with type='fmcsa_change'. The recipient is
--     the user_id from the clients row (creator-owned, same convention as
--     generate-notifications). entity_id points back to the client.
--
-- Scheduling:
--   - cron.schedule('fmcsa-monitor-weekly', '0 4 * * 1', ...) — Mondays at
--     04:00 UTC. The job uses pg_net to invoke the fmcsa-monitor Edge
--     Function, mirroring the check-permit-expirations pattern.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) fmcsa_snapshots
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fmcsa_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  dot text NOT NULL,
  safety_rating text,
  status_code text,
  total_drivers integer,
  total_power_units integer,
  carrier_operation text,
  raw jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fmcsa_snapshots_client_fetched_at
  ON public.fmcsa_snapshots(client_id, fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_fmcsa_snapshots_org_id
  ON public.fmcsa_snapshots(org_id);

ALTER TABLE public.fmcsa_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members read fmcsa snapshots" ON public.fmcsa_snapshots;
CREATE POLICY "org members read fmcsa snapshots"
  ON public.fmcsa_snapshots FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

-- Service role inserts via the Edge Function. No INSERT policy for
-- `authenticated` — snapshots are produced by the monitor, not by users.

-- ---------------------------------------------------------------------------
-- 2) Cron job — weekly invocation of the fmcsa-monitor Edge Function
-- ---------------------------------------------------------------------------

DO $outer$
BEGIN
  -- Same guard as the other Edge-Function crons: skip silently in
  -- environments where the vault secrets aren't provisioned yet.
  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_functions_url')
     AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN

    BEGIN
      PERFORM cron.unschedule('fmcsa-monitor-weekly');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM cron.schedule(
      'fmcsa-monitor-weekly',
      '0 4 * * 1',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_functions_url') || '/fmcsa-monitor',
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
