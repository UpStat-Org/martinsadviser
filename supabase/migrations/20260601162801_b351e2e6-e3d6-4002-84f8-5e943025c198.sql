
-- Migration 1: compliance task automation
CREATE TABLE public.compliance_automation_settings (
  org_id       uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled      boolean NOT NULL DEFAULT true,
  lead_days    integer NOT NULL DEFAULT 30 CHECK (lead_days BETWEEN 1 AND 180),
  ifta_enabled    boolean NOT NULL DEFAULT true,
  kyu_enabled     boolean NOT NULL DEFAULT true,
  nm_enabled      boolean NOT NULL DEFAULT true,
  hvut_enabled    boolean NOT NULL DEFAULT true,
  ucr_enabled     boolean NOT NULL DEFAULT true,
  mcs150_enabled  boolean NOT NULL DEFAULT true,
  notify       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_automation_settings TO authenticated;
GRANT ALL ON public.compliance_automation_settings TO service_role;

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

INSERT INTO public.compliance_automation_settings (org_id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (org_id) DO NOTHING;

CREATE TABLE public.compliance_task_log (
  id          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      uuid NOT NULL DEFAULT public.current_org_id()
                REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id   uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  truck_id    uuid REFERENCES public.trucks(id) ON DELETE CASCADE,
  kind        text NOT NULL,
  due_date    date NOT NULL,
  task_id     uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  dedupe_key  text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.compliance_task_log TO authenticated;
GRANT ALL ON public.compliance_task_log TO service_role;

CREATE INDEX idx_compliance_task_log_org_id ON public.compliance_task_log(org_id);
CREATE INDEX idx_compliance_task_log_client ON public.compliance_task_log(client_id);

ALTER TABLE public.compliance_task_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read compliance task log"
  ON public.compliance_task_log FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

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

-- Migration 2: dunning + aging
CREATE TABLE public.dunning_settings (
  org_id      uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled     boolean NOT NULL DEFAULT true,
  auto_send   boolean NOT NULL DEFAULT false,
  stage_days  integer[] NOT NULL DEFAULT '{1,7,15,30}',
  channels    text[] NOT NULL DEFAULT '{email,whatsapp}',
  subject     text NOT NULL DEFAULT 'Fatura em atraso',
  body        text NOT NULL DEFAULT
    E'Olá {company_name},\n\nConsta em aberto a fatura de {amount}, vencida em {due_date} (há {days_overdue} dia(s)).\n\nPor favor, regularize o pagamento ou entre em contato.',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dunning_settings TO authenticated;
GRANT ALL ON public.dunning_settings TO service_role;

ALTER TABLE public.dunning_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read dunning settings"
  ON public.dunning_settings FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org admins insert dunning settings"
  ON public.dunning_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(org_id));

CREATE POLICY "org admins update dunning settings"
  ON public.dunning_settings FOR UPDATE TO authenticated
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

CREATE TRIGGER update_dunning_settings_updated_at
  BEFORE UPDATE ON public.dunning_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.dunning_settings (org_id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (org_id) DO NOTHING;

CREATE TABLE public.dunning_log (
  id          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      uuid NOT NULL DEFAULT public.current_org_id()
                REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id  uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  stage       integer NOT NULL,
  enqueued    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, stage)
);

GRANT SELECT ON public.dunning_log TO authenticated;
GRANT ALL ON public.dunning_log TO service_role;

CREATE INDEX idx_dunning_log_org_id ON public.dunning_log(org_id);
CREATE INDEX idx_dunning_log_invoice ON public.dunning_log(invoice_id);

ALTER TABLE public.dunning_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read dunning log"
  ON public.dunning_log FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_functions_url')
     AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN

    PERFORM cron.unschedule('generate-dunning-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-dunning-daily');

    PERFORM cron.schedule(
      'generate-dunning-daily',
      '30 9 * * *',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_functions_url') || '/generate-dunning',
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
