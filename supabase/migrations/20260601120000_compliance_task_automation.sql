-- ============================================================================
-- Feature 1 — Compliance Calendar → Task Automation Engine
--
-- The fixed-schedule federal/state filing deadlines (IFTA / KYU / NM quarterly,
-- HVUT / UCR annual, MCS-150 biennial) are generated procedurally in the app
-- (src/lib/complianceCalendar.ts) but never *acted on*. This migration adds the
-- backing store for an engine (edge function `generate-compliance-tasks`,
-- scheduled below) that walks those deadlines and opens a Kanban task ahead of
-- each one, scoped per client by the services they actually subscribe to.
--
-- Two tables:
--   * compliance_automation_settings — per-org config (on/off, lead time, and
--     a per-category enable switch). One row per org.
--   * compliance_task_log — idempotency ledger. UNIQUE(dedupe_key) guarantees a
--     given (category, due date, client[, truck]) only ever spawns one task,
--     even across concurrent / repeated cron runs.
--
-- Follows the established multitenancy conventions: org_id NOT NULL DEFAULT
-- current_org_id(), RLS via is_org_member()/is_org_admin(). The edge function
-- runs as service_role and passes org_id explicitly.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) compliance_automation_settings (per-org config)
-- ---------------------------------------------------------------------------
CREATE TABLE public.compliance_automation_settings (
  org_id       uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled      boolean NOT NULL DEFAULT true,
  -- How many days ahead of a deadline to open the task.
  lead_days    integer NOT NULL DEFAULT 30 CHECK (lead_days BETWEEN 1 AND 180),
  -- Per-category switches so an agency can opt out of categories it never files.
  ifta_enabled    boolean NOT NULL DEFAULT true,
  kyu_enabled     boolean NOT NULL DEFAULT true,
  nm_enabled      boolean NOT NULL DEFAULT true,
  hvut_enabled    boolean NOT NULL DEFAULT true,
  ucr_enabled     boolean NOT NULL DEFAULT true,
  mcs150_enabled  boolean NOT NULL DEFAULT true,
  -- Also drop an in-app notification when a task is opened.
  notify       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read compliance automation settings"
  ON public.compliance_automation_settings FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org admins upsert compliance automation settings"
  ON public.compliance_automation_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(org_id));

CREATE POLICY "org admins update compliance automation settings"
  ON public.compliance_automation_settings FOR UPDATE TO authenticated
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

CREATE TRIGGER update_compliance_automation_settings_updated_at
  BEFORE UPDATE ON public.compliance_automation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the default/master org so the engine has a row to read on day one.
INSERT INTO public.compliance_automation_settings (org_id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (org_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) compliance_task_log (idempotency ledger)
-- ---------------------------------------------------------------------------
CREATE TABLE public.compliance_task_log (
  id          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      uuid NOT NULL DEFAULT public.current_org_id()
                REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id   uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  truck_id    uuid REFERENCES public.trucks(id) ON DELETE CASCADE,
  kind        text NOT NULL,   -- iftaQuarter | kyuQuarter | nmQuarter | hvutAnnual | ucrAnnual | mcs150Biennial
  due_date    date NOT NULL,
  task_id     uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  -- "<kind>:<due_date>:<client_id>:<truck_id|->" — single source of truth for dedupe.
  dedupe_key  text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_task_log_org_id ON public.compliance_task_log(org_id);
CREATE INDEX idx_compliance_task_log_client ON public.compliance_task_log(client_id);

ALTER TABLE public.compliance_task_log ENABLE ROW LEVEL SECURITY;

-- Read-only for org members; all writes come from the service_role engine
-- (which bypasses RLS). No authenticated INSERT/UPDATE policy on purpose.
CREATE POLICY "org members read compliance task log"
  ON public.compliance_task_log FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- 3) Cron — run the engine daily at 09:15 UTC (just after the permit check).
--    Mirrors the Vault-secret pattern from messages_hardening so the function
--    URL and service JWT never land in plaintext migrations.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_functions_url')
     AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN

    PERFORM cron.unschedule('generate-compliance-tasks-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-compliance-tasks-daily');

    PERFORM cron.schedule(
      'generate-compliance-tasks-daily',
      '15 9 * * *',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_functions_url') || '/generate-compliance-tasks',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
          ),
          body := '{}'::jsonb
        );
      $job$
    );
  END IF;
END
$$;
