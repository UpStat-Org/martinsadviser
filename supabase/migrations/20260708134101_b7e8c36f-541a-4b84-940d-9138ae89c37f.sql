
-- services
CREATE TABLE IF NOT EXISTS public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  description text,
  default_price numeric(12,2) NOT NULL DEFAULT 0,
  billing_type text NOT NULL DEFAULT 'flat' CHECK (billing_type IN ('flat','monthly','quarterly','yearly')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_services_org ON public.services(org_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read services" ON public.services;
DROP POLICY IF EXISTS "org members insert services" ON public.services;
DROP POLICY IF EXISTS "org members update services" ON public.services;
DROP POLICY IF EXISTS "org members delete services" ON public.services;
CREATE POLICY "org members read services" ON public.services FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "org members insert services" ON public.services FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
CREATE POLICY "org members update services" ON public.services FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org members delete services" ON public.services FOR DELETE TO authenticated USING (public.is_org_member(org_id));
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('state_fee','filing_fee','third_party','software','labor','other')),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  description text,
  incurred_on date NOT NULL DEFAULT (now()::date),
  billable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_org ON public.expenses(org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_client ON public.expenses(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_incurred ON public.expenses(incurred_on);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read expenses" ON public.expenses;
DROP POLICY IF EXISTS "org members insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "org members update expenses" ON public.expenses;
DROP POLICY IF EXISTS "org members delete expenses" ON public.expenses;
CREATE POLICY "org members read expenses" ON public.expenses FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "org members insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
CREATE POLICY "org members update expenses" ON public.expenses FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org members delete expenses" ON public.expenses FOR DELETE TO authenticated USING (public.is_org_member(org_id));
DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- recurring_plans
CREATE TABLE IF NOT EXISTS public.recurring_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly','quarterly','yearly')),
  net_days integer NOT NULL DEFAULT 15,
  next_run_on date NOT NULL DEFAULT (now()::date),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  description text,
  last_invoice_on date,
  invoices_generated integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recurring_org ON public.recurring_plans(org_id);
CREATE INDEX IF NOT EXISTS idx_recurring_client ON public.recurring_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_due ON public.recurring_plans(status, next_run_on);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_plans TO authenticated;
GRANT ALL ON public.recurring_plans TO service_role;
ALTER TABLE public.recurring_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read recurring" ON public.recurring_plans;
DROP POLICY IF EXISTS "org members insert recurring" ON public.recurring_plans;
DROP POLICY IF EXISTS "org members update recurring" ON public.recurring_plans;
DROP POLICY IF EXISTS "org members delete recurring" ON public.recurring_plans;
CREATE POLICY "org members read recurring" ON public.recurring_plans FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "org members insert recurring" ON public.recurring_plans FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
CREATE POLICY "org members update recurring" ON public.recurring_plans FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org members delete recurring" ON public.recurring_plans FOR DELETE TO authenticated USING (public.is_org_member(org_id));
DROP TRIGGER IF EXISTS update_recurring_updated_at ON public.recurring_plans;
CREATE TRIGGER update_recurring_updated_at BEFORE UPDATE ON public.recurring_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- leads
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  dot text,
  mc text,
  stage text NOT NULL DEFAULT 'new' CHECK (stage IN ('new','contacted','qualified','proposal','won','lost')),
  source text,
  estimated_value numeric(12,2),
  notes text,
  assigned_to uuid,
  converted_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  lost_reason text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(org_id, stage);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read leads" ON public.leads;
DROP POLICY IF EXISTS "org members insert leads" ON public.leads;
DROP POLICY IF EXISTS "org members update leads" ON public.leads;
DROP POLICY IF EXISTS "org members delete leads" ON public.leads;
CREATE POLICY "org members read leads" ON public.leads FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "org members insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
CREATE POLICY "org members update leads" ON public.leads FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org members delete leads" ON public.leads FOR DELETE TO authenticated USING (public.is_org_member(org_id));
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- quotes
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  quote_number text,
  title text NOT NULL DEFAULT 'Proposta',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  valid_until date,
  notes text,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  sent_at timestamptz,
  accepted_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quotes_org ON public.quotes(org_id);
CREATE INDEX IF NOT EXISTS idx_quotes_lead ON public.quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client ON public.quotes(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read quotes" ON public.quotes;
DROP POLICY IF EXISTS "org members insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "org members update quotes" ON public.quotes;
DROP POLICY IF EXISTS "org members delete quotes" ON public.quotes;
CREATE POLICY "org members read quotes" ON public.quotes FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "org members insert quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
CREATE POLICY "org members update quotes" ON public.quotes FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org members delete quotes" ON public.quotes FOR DELETE TO authenticated USING (public.is_org_member(org_id));
DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- quote_items
CREATE TABLE IF NOT EXISTS public.quote_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  billing_type text NOT NULL DEFAULT 'flat' CHECK (billing_type IN ('flat','monthly','quarterly','yearly')),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_org ON public.quote_items(org_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read quote_items" ON public.quote_items;
DROP POLICY IF EXISTS "org members insert quote_items" ON public.quote_items;
DROP POLICY IF EXISTS "org members update quote_items" ON public.quote_items;
DROP POLICY IF EXISTS "org members delete quote_items" ON public.quote_items;
CREATE POLICY "org members read quote_items" ON public.quote_items FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "org members insert quote_items" ON public.quote_items FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org members update quote_items" ON public.quote_items FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org members delete quote_items" ON public.quote_items FOR DELETE TO authenticated USING (public.is_org_member(org_id));

-- quote_number auto-assignment
CREATE OR REPLACE FUNCTION public.assign_quote_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_seq integer;
BEGIN
  IF NEW.quote_number IS NOT NULL AND NEW.quote_number <> '' THEN RETURN NEW; END IF;
  SELECT COALESCE(COUNT(*), 0) + 1 INTO next_seq FROM public.quotes WHERE org_id = NEW.org_id;
  NEW.quote_number := 'Q-' || lpad(next_seq::text, 4, '0');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS assign_quote_number_trg ON public.quotes;
CREATE TRIGGER assign_quote_number_trg BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.assign_quote_number();

-- Cron for recurring invoices
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
END $$;
