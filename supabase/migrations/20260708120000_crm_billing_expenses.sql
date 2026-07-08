-- ============================================================================
-- CRM + Billing extensions — Features 3, 4, 5, 6
--
--   (3) recurring_plans    — retainer/subscription billing for END clients.
--                            A daily cron (generate-recurring-invoices) turns
--                            each due plan into an invoices row and advances it.
--   (4) expenses           — per-client cost tracking so profit-per-client is
--                            real revenue − (labor + direct costs), not just labor.
--   (5) leads              — sales pipeline (kanban by stage) for PROSPECTS,
--                            distinct from clients (who are already onboarded).
--   (6) quotes/quote_items — proposals built from the service catalog. On accept
--                            they convert the lead → client and/or spawn invoices
--                            and recurring plans.
--
--   services               — shared catalog of billable services, reused by both
--                            the quote builder and recurring plans.
--
-- All tables follow the house multi-tenancy pattern: org_id DEFAULT
-- current_org_id(), RLS by is_org_member, updated_at trigger.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- services — org-level catalog of billable services
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid NOT NULL DEFAULT public.current_org_id()
                  REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL DEFAULT auth.uid(),
  name          text NOT NULL,
  description   text,
  default_price numeric(12,2) NOT NULL DEFAULT 0,
  -- 'flat' one-off, or a recurring cadence usable as a plan template.
  billing_type  text NOT NULL DEFAULT 'flat'
                  CHECK (billing_type IN ('flat','monthly','quarterly','yearly')),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_services_org ON public.services(org_id);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read services" ON public.services FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "org members insert services" ON public.services FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
CREATE POLICY "org members update services" ON public.services FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org members delete services" ON public.services FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- expenses — per-client (or org-level) cost tracking          [Feature 4]
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       uuid NOT NULL DEFAULT public.current_org_id()
                 REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL DEFAULT auth.uid(),
  -- Nullable: an org-wide cost (software, subscriptions) not tied to one client.
  client_id    uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  -- Optional link to the invoice this cost was incurred to fulfil.
  invoice_id   uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  category     text NOT NULL DEFAULT 'other'
                 CHECK (category IN ('state_fee','filing_fee','third_party','software','labor','other')),
  amount       numeric(12,2) NOT NULL DEFAULT 0,
  description  text,
  incurred_on  date NOT NULL DEFAULT (now()::date),
  billable     boolean NOT NULL DEFAULT false,  -- reimbursed/passed through to client
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_org ON public.expenses(org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_client ON public.expenses(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_incurred ON public.expenses(incurred_on);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read expenses" ON public.expenses FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "org members insert expenses" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
CREATE POLICY "org members update expenses" ON public.expenses FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org members delete expenses" ON public.expenses FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- recurring_plans — retainer / subscription billing            [Feature 3]
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_plans (
  id             uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id         uuid NOT NULL DEFAULT public.current_org_id()
                   REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL DEFAULT auth.uid(),
  client_id      uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id     uuid REFERENCES public.services(id) ON DELETE SET NULL,
  name           text NOT NULL,
  amount         numeric(12,2) NOT NULL DEFAULT 0,
  frequency      text NOT NULL DEFAULT 'monthly'
                   CHECK (frequency IN ('monthly','quarterly','yearly')),
  -- Days added to the run date to compute the generated invoice's due_date.
  net_days       integer NOT NULL DEFAULT 15,
  -- Next date the engine should generate an invoice. NULL/past + active = due.
  next_run_on    date NOT NULL DEFAULT (now()::date),
  status         text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','paused','cancelled')),
  description    text,
  last_invoice_on date,
  invoices_generated integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recurring_org ON public.recurring_plans(org_id);
CREATE INDEX IF NOT EXISTS idx_recurring_client ON public.recurring_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_due ON public.recurring_plans(status, next_run_on);

ALTER TABLE public.recurring_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read recurring" ON public.recurring_plans FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "org members insert recurring" ON public.recurring_plans FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
CREATE POLICY "org members update recurring" ON public.recurring_plans FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org members delete recurring" ON public.recurring_plans FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));
CREATE TRIGGER update_recurring_updated_at BEFORE UPDATE ON public.recurring_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- leads — sales pipeline for prospects                          [Feature 5]
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid NOT NULL DEFAULT public.current_org_id()
                  REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL DEFAULT auth.uid(),
  company_name  text NOT NULL,
  contact_name  text,
  email         text,
  phone         text,
  dot           text,
  mc            text,
  stage         text NOT NULL DEFAULT 'new'
                  CHECK (stage IN ('new','contacted','qualified','proposal','won','lost')),
  source        text,
  estimated_value numeric(12,2),
  notes         text,
  assigned_to   uuid,
  -- Set when the lead is won and promoted to a client.
  converted_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  lost_reason   text,
  -- Kanban ordering within a stage column.
  position      integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(org_id, stage);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read leads" ON public.leads FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "org members insert leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
CREATE POLICY "org members update leads" ON public.leads FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org members delete leads" ON public.leads FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- quotes + quote_items — proposals                             [Feature 6]
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quotes (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid NOT NULL DEFAULT public.current_org_id()
                  REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL DEFAULT auth.uid(),
  -- A quote targets either a prospect (lead) or an existing client.
  lead_id       uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id     uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  quote_number  text,                       -- auto-assigned per org (Q-0001)
  title         text NOT NULL DEFAULT 'Proposta',
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  valid_until   date,
  notes         text,
  discount      numeric(12,2) NOT NULL DEFAULT 0,
  -- subtotal/total are maintained by the app from quote_items; stored for lists.
  subtotal      numeric(12,2) NOT NULL DEFAULT 0,
  total         numeric(12,2) NOT NULL DEFAULT 0,
  sent_at       timestamptz,
  accepted_at   timestamptz,
  -- Set once accepted and converted, to prevent double-conversion.
  converted_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quotes_org ON public.quotes(org_id);
CREATE INDEX IF NOT EXISTS idx_quotes_lead ON public.quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client ON public.quotes(client_id);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read quotes" ON public.quotes FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "org members insert quotes" ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
CREATE POLICY "org members update quotes" ON public.quotes FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org members delete quotes" ON public.quotes FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.quote_items (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid NOT NULL DEFAULT public.current_org_id()
                  REFERENCES public.organizations(id) ON DELETE CASCADE,
  quote_id      uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  service_id    uuid REFERENCES public.services(id) ON DELETE SET NULL,
  description   text NOT NULL DEFAULT '',
  quantity      numeric(12,2) NOT NULL DEFAULT 1,
  unit_price    numeric(12,2) NOT NULL DEFAULT 0,
  -- 'flat' bills once (→ invoice); recurring lines seed a recurring_plan on accept.
  billing_type  text NOT NULL DEFAULT 'flat'
                  CHECK (billing_type IN ('flat','monthly','quarterly','yearly')),
  position      integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_org ON public.quote_items(org_id);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read quote_items" ON public.quote_items FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "org members insert quote_items" ON public.quote_items FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org members update quote_items" ON public.quote_items FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org members delete quote_items" ON public.quote_items FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- quote_number auto-assignment — sequential per org (Q-0001, Q-0002, …)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_quote_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_seq integer;
BEGIN
  IF NEW.quote_number IS NOT NULL AND NEW.quote_number <> '' THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(COUNT(*), 0) + 1 INTO next_seq
    FROM public.quotes WHERE org_id = NEW.org_id;
  NEW.quote_number := 'Q-' || lpad(next_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_quote_number_trg ON public.quotes;
CREATE TRIGGER assign_quote_number_trg BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.assign_quote_number();

-- ---------------------------------------------------------------------------
-- Cron — generate recurring invoices daily at 06:00 UTC
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_functions_url')
     AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN

    PERFORM cron.unschedule('generate-recurring-invoices-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-recurring-invoices-daily');

    PERFORM cron.schedule(
      'generate-recurring-invoices-daily',
      '0 6 * * *',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_functions_url') || '/generate-recurring-invoices',
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
