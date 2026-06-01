-- ============================================================================
-- Feature 3 — Accounts-Receivable Dunning (collection cadence)
--
-- Today an overdue invoice produces a single in-app notification and nothing
-- else. This migration backs an escalating collection cadence: the engine
-- (edge function `generate-dunning`, scheduled below) walks overdue invoices
-- and, at each configured day-past-due stage, drafts a reminder to the client.
--
-- Per the product decision the cadence runs as an APPROVAL QUEUE: drafts are
-- written into scheduled_messages with status = 'pending_review', which the
-- send queue (claim_pending_messages → only status='pending') deliberately
-- ignores until a human approves them (flips status → 'pending'). When
-- auto_send is enabled they are written straight as 'pending' instead.
--
-- The A/R aging report itself is computed client-side (src/lib/aging.ts) from
-- existing invoice rows, so it needs no schema.
--
-- Two tables:
--   * dunning_settings — per-org cadence config (one row per org).
--   * dunning_log      — idempotency ledger, UNIQUE(invoice_id, stage) so each
--     stage of each invoice is only ever drafted once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) dunning_settings (per-org config)
-- ---------------------------------------------------------------------------
CREATE TABLE public.dunning_settings (
  org_id      uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled     boolean NOT NULL DEFAULT true,
  -- false ⇒ drafts land in the approval queue; true ⇒ enqueued for sending.
  auto_send   boolean NOT NULL DEFAULT false,
  -- Days-past-due at which to escalate. Each value fires at most once/invoice.
  stage_days  integer[] NOT NULL DEFAULT '{1,7,15,30}',
  -- Channels to draft on each fire (email / whatsapp), reusing send-emails.
  channels    text[] NOT NULL DEFAULT '{email,whatsapp}',
  subject     text NOT NULL DEFAULT 'Fatura em atraso',
  body        text NOT NULL DEFAULT
    E'Olá {company_name},\n\nConsta em aberto a fatura de {amount}, vencida em {due_date} (há {days_overdue} dia(s)).\n\nPor favor, regularize o pagamento ou entre em contato.',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

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

-- ---------------------------------------------------------------------------
-- 2) dunning_log (idempotency ledger)
-- ---------------------------------------------------------------------------
CREATE TABLE public.dunning_log (
  id          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      uuid NOT NULL DEFAULT public.current_org_id()
                REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id  uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  stage       integer NOT NULL,         -- the stage_days value that fired
  enqueued    boolean NOT NULL DEFAULT false, -- a message was actually drafted
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, stage)
);

CREATE INDEX idx_dunning_log_org_id ON public.dunning_log(org_id);
CREATE INDEX idx_dunning_log_invoice ON public.dunning_log(invoice_id);

ALTER TABLE public.dunning_log ENABLE ROW LEVEL SECURITY;

-- Read-only for org members; all writes come from the service_role engine.
CREATE POLICY "org members read dunning log"
  ON public.dunning_log FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- 3) Cron — run the dunning engine daily at 09:30 UTC.
-- ---------------------------------------------------------------------------
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
