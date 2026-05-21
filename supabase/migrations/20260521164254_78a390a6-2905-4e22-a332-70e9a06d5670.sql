-- ============================================================================
-- FMCSA continuous monitoring
-- ============================================================================

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

DO $outer$
BEGIN
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

-- ============================================================================
-- MCS-150 tracking
-- ============================================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS mcs_150_last_filed_at date;

COMMENT ON COLUMN public.clients.mcs_150_last_filed_at IS
  'Date of last MCS-150 biennial update filing.';

-- ============================================================================
-- Drivers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  date_of_birth date,
  ssn_last4 text,
  phone text,
  email text,
  cdl_number text,
  cdl_state text,
  cdl_class text CHECK (cdl_class IN ('A', 'B', 'C') OR cdl_class IS NULL),
  cdl_endorsements text,
  cdl_issued_on date,
  cdl_expires_on date,
  medical_card_expires_on date,
  medical_examiner_name text,
  hire_date date,
  termination_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drivers_org_id ON public.drivers(org_id);
CREATE INDEX IF NOT EXISTS idx_drivers_client_id ON public.drivers(client_id);
CREATE INDEX IF NOT EXISTS idx_drivers_cdl_expires_on ON public.drivers(cdl_expires_on);
CREATE INDEX IF NOT EXISTS idx_drivers_medical_card_expires_on ON public.drivers(medical_card_expires_on);
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read drivers" ON public.drivers;
CREATE POLICY "org members read drivers" ON public.drivers FOR SELECT TO authenticated USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert drivers" ON public.drivers;
CREATE POLICY "org members insert drivers" ON public.drivers FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update drivers" ON public.drivers;
CREATE POLICY "org members update drivers" ON public.drivers FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete drivers" ON public.drivers;
CREATE POLICY "org members delete drivers" ON public.drivers FOR DELETE TO authenticated USING (public.is_org_member(org_id));
ALTER TABLE public.drivers ALTER COLUMN org_id SET DEFAULT public.current_org_id();
DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- DQF + Drug testing
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.driver_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('application','mvr','road_test','employment_verification','medical_exam','drug_test','training','other')),
  document_url text,
  issued_on date,
  expires_on date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON public.driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_org_id ON public.driver_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_expires_on ON public.driver_documents(expires_on);
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read driver_documents" ON public.driver_documents;
CREATE POLICY "org members read driver_documents" ON public.driver_documents FOR SELECT TO authenticated USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert driver_documents" ON public.driver_documents;
CREATE POLICY "org members insert driver_documents" ON public.driver_documents FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update driver_documents" ON public.driver_documents;
CREATE POLICY "org members update driver_documents" ON public.driver_documents FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete driver_documents" ON public.driver_documents;
CREATE POLICY "org members delete driver_documents" ON public.driver_documents FOR DELETE TO authenticated USING (public.is_org_member(org_id));
ALTER TABLE public.driver_documents ALTER COLUMN org_id SET DEFAULT public.current_org_id();
DROP TRIGGER IF EXISTS update_driver_documents_updated_at ON public.driver_documents;
CREATE TRIGGER update_driver_documents_updated_at BEFORE UPDATE ON public.driver_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.drug_test_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  test_type text NOT NULL CHECK (test_type IN ('pre_employment','random','post_accident','reasonable_suspicion','return_to_duty','follow_up')),
  substance text NOT NULL DEFAULT 'drug' CHECK (substance IN ('drug','alcohol')),
  selection_for_quarter text,
  scheduled_for date,
  collected_at timestamptz,
  result text CHECK (result IN ('pending','negative','positive','refused','cancelled') OR result IS NULL),
  mro_reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drug_test_events_driver_id ON public.drug_test_events(driver_id);
CREATE INDEX IF NOT EXISTS idx_drug_test_events_org_id ON public.drug_test_events(org_id);
CREATE INDEX IF NOT EXISTS idx_drug_test_events_quarter ON public.drug_test_events(selection_for_quarter);
ALTER TABLE public.drug_test_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read drug_test_events" ON public.drug_test_events;
CREATE POLICY "org members read drug_test_events" ON public.drug_test_events FOR SELECT TO authenticated USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert drug_test_events" ON public.drug_test_events;
CREATE POLICY "org members insert drug_test_events" ON public.drug_test_events FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update drug_test_events" ON public.drug_test_events;
CREATE POLICY "org members update drug_test_events" ON public.drug_test_events FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete drug_test_events" ON public.drug_test_events;
CREATE POLICY "org members delete drug_test_events" ON public.drug_test_events FOR DELETE TO authenticated USING (public.is_org_member(org_id));
ALTER TABLE public.drug_test_events ALTER COLUMN org_id SET DEFAULT public.current_org_id();
DROP TRIGGER IF EXISTS update_drug_test_events_updated_at ON public.drug_test_events;
CREATE TRIGGER update_drug_test_events_updated_at BEFORE UPDATE ON public.drug_test_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- HVUT 2290
-- ============================================================================
ALTER TABLE public.trucks
  ADD COLUMN IF NOT EXISTS taxable_gross_weight_lbs integer;
COMMENT ON COLUMN public.trucks.taxable_gross_weight_lbs IS 'Combined taxable gross weight in pounds. Drives HVUT 2290 tax calculation.';

CREATE TABLE IF NOT EXISTS public.hvut_filings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  truck_id uuid NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tax_year integer NOT NULL,
  first_used_month text,
  taxable_gross_weight_lbs integer,
  suspended boolean NOT NULL DEFAULT false,
  tax_amount numeric(12,2),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','filed','paid','amended')),
  filed_at date,
  irs_confirmation text,
  schedule_1_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hvut_filings_truck_id ON public.hvut_filings(truck_id);
CREATE INDEX IF NOT EXISTS idx_hvut_filings_org_id ON public.hvut_filings(org_id);
CREATE INDEX IF NOT EXISTS idx_hvut_filings_tax_year ON public.hvut_filings(tax_year);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hvut_filings_truck_year ON public.hvut_filings(truck_id, tax_year);
ALTER TABLE public.hvut_filings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read hvut" ON public.hvut_filings;
CREATE POLICY "org members read hvut" ON public.hvut_filings FOR SELECT TO authenticated USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert hvut" ON public.hvut_filings;
CREATE POLICY "org members insert hvut" ON public.hvut_filings FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update hvut" ON public.hvut_filings;
CREATE POLICY "org members update hvut" ON public.hvut_filings FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete hvut" ON public.hvut_filings;
CREATE POLICY "org members delete hvut" ON public.hvut_filings FOR DELETE TO authenticated USING (public.is_org_member(org_id));
ALTER TABLE public.hvut_filings ALTER COLUMN org_id SET DEFAULT public.current_org_id();
DROP TRIGGER IF EXISTS update_hvut_filings_updated_at ON public.hvut_filings;
CREATE TRIGGER update_hvut_filings_updated_at BEFORE UPDATE ON public.hvut_filings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- IFTA
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ifta_trips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  trip_date date NOT NULL,
  quarter text NOT NULL,
  total_miles numeric(10,2) NOT NULL DEFAULT 0,
  miles_by_jurisdiction jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ifta_trips_client_quarter ON public.ifta_trips(client_id, quarter);
CREATE INDEX IF NOT EXISTS idx_ifta_trips_truck_quarter ON public.ifta_trips(truck_id, quarter);
CREATE INDEX IF NOT EXISTS idx_ifta_trips_org_id ON public.ifta_trips(org_id);
ALTER TABLE public.ifta_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifta_trips ALTER COLUMN org_id SET DEFAULT public.current_org_id();
DROP POLICY IF EXISTS "org members read ifta_trips" ON public.ifta_trips;
CREATE POLICY "org members read ifta_trips" ON public.ifta_trips FOR SELECT TO authenticated USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert ifta_trips" ON public.ifta_trips;
CREATE POLICY "org members insert ifta_trips" ON public.ifta_trips FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update ifta_trips" ON public.ifta_trips;
CREATE POLICY "org members update ifta_trips" ON public.ifta_trips FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete ifta_trips" ON public.ifta_trips;
CREATE POLICY "org members delete ifta_trips" ON public.ifta_trips FOR DELETE TO authenticated USING (public.is_org_member(org_id));
DROP TRIGGER IF EXISTS update_ifta_trips_updated_at ON public.ifta_trips;
CREATE TRIGGER update_ifta_trips_updated_at BEFORE UPDATE ON public.ifta_trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ifta_fuel_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  purchase_date date NOT NULL,
  quarter text NOT NULL,
  jurisdiction text NOT NULL,
  gallons numeric(10,3) NOT NULL,
  gross_price numeric(12,2),
  receipt_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ifta_fuel_client_quarter ON public.ifta_fuel_purchases(client_id, quarter);
CREATE INDEX IF NOT EXISTS idx_ifta_fuel_truck_quarter ON public.ifta_fuel_purchases(truck_id, quarter);
CREATE INDEX IF NOT EXISTS idx_ifta_fuel_org_id ON public.ifta_fuel_purchases(org_id);
ALTER TABLE public.ifta_fuel_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifta_fuel_purchases ALTER COLUMN org_id SET DEFAULT public.current_org_id();
DROP POLICY IF EXISTS "org members read ifta_fuel" ON public.ifta_fuel_purchases;
CREATE POLICY "org members read ifta_fuel" ON public.ifta_fuel_purchases FOR SELECT TO authenticated USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert ifta_fuel" ON public.ifta_fuel_purchases;
CREATE POLICY "org members insert ifta_fuel" ON public.ifta_fuel_purchases FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update ifta_fuel" ON public.ifta_fuel_purchases;
CREATE POLICY "org members update ifta_fuel" ON public.ifta_fuel_purchases FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete ifta_fuel" ON public.ifta_fuel_purchases;
CREATE POLICY "org members delete ifta_fuel" ON public.ifta_fuel_purchases FOR DELETE TO authenticated USING (public.is_org_member(org_id));
DROP TRIGGER IF EXISTS update_ifta_fuel_updated_at ON public.ifta_fuel_purchases;
CREATE TRIGGER update_ifta_fuel_updated_at BEFORE UPDATE ON public.ifta_fuel_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ifta_tax_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  quarter text NOT NULL,
  jurisdiction text NOT NULL,
  rate_per_gallon numeric(10,5) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ifta_rates_org_quarter_juris ON public.ifta_tax_rates(org_id, quarter, jurisdiction);
ALTER TABLE public.ifta_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifta_tax_rates ALTER COLUMN org_id SET DEFAULT public.current_org_id();
DROP POLICY IF EXISTS "org members read ifta_rates" ON public.ifta_tax_rates;
CREATE POLICY "org members read ifta_rates" ON public.ifta_tax_rates FOR SELECT TO authenticated USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members write ifta_rates" ON public.ifta_tax_rates;
CREATE POLICY "org members write ifta_rates" ON public.ifta_tax_rates FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete ifta_rates" ON public.ifta_tax_rates;
CREATE POLICY "org members delete ifta_rates" ON public.ifta_tax_rates FOR DELETE TO authenticated USING (public.is_org_member(org_id));

CREATE TABLE IF NOT EXISTS public.ifta_filings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  quarter text NOT NULL,
  total_miles numeric(12,2),
  total_gallons numeric(12,3),
  fleet_mpg numeric(8,4),
  breakdown_by_jurisdiction jsonb,
  total_tax_due numeric(12,2),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','filed','paid')),
  filed_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ifta_filings_client_quarter ON public.ifta_filings(client_id, quarter);
CREATE INDEX IF NOT EXISTS idx_ifta_filings_org_id ON public.ifta_filings(org_id);
ALTER TABLE public.ifta_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifta_filings ALTER COLUMN org_id SET DEFAULT public.current_org_id();
DROP POLICY IF EXISTS "org members read ifta_filings" ON public.ifta_filings;
CREATE POLICY "org members read ifta_filings" ON public.ifta_filings FOR SELECT TO authenticated USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert ifta_filings" ON public.ifta_filings;
CREATE POLICY "org members insert ifta_filings" ON public.ifta_filings FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update ifta_filings" ON public.ifta_filings;
CREATE POLICY "org members update ifta_filings" ON public.ifta_filings FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP TRIGGER IF EXISTS update_ifta_filings_updated_at ON public.ifta_filings;
CREATE TRIGGER update_ifta_filings_updated_at BEFORE UPDATE ON public.ifta_filings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();