-- ============================================================================
-- IFTA quarterly filing — trip log, fuel log, jurisdiction tax rates, filings
--
-- The agency collects per-truck mileage broken down by jurisdiction and fuel
-- purchases by jurisdiction; per quarter we aggregate per client into a
-- single IFTA filing. Tax owed per jurisdiction =
--
--   taxable_gallons[j] = taxable_miles[j] / fleet_MPG
--   tax_owed[j]        = taxable_gallons[j] * rate[j] - fuel_tax_paid[j]
--
-- where fuel_tax_paid[j] is approximated as gallons_purchased[j] * rate[j].
--
-- Net positive = owe the state. Net negative = refund/credit.
--
-- Tax rates change quarterly per jurisdiction. The agency populates them via
-- admin UI (or imports the official quarterly rate sheet — out of scope for
-- this MVP).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) ifta_trips — single trip leg with miles by jurisdiction
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ifta_trips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,

  trip_date date NOT NULL,
  -- 'YYYY-Qn' — denormalized for grouping; computed by app from trip_date.
  quarter text NOT NULL,

  -- Total miles for the trip across all jurisdictions. Should equal sum of
  -- miles_by_jurisdiction values; we keep both for auditability.
  total_miles numeric(10, 2) NOT NULL DEFAULT 0,
  -- jsonb: { "TX": 250.5, "NM": 180.0, ... }  (state codes uppercase)
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
CREATE POLICY "org members read ifta_trips" ON public.ifta_trips FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert ifta_trips" ON public.ifta_trips;
CREATE POLICY "org members insert ifta_trips" ON public.ifta_trips FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update ifta_trips" ON public.ifta_trips;
CREATE POLICY "org members update ifta_trips" ON public.ifta_trips FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete ifta_trips" ON public.ifta_trips;
CREATE POLICY "org members delete ifta_trips" ON public.ifta_trips FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_ifta_trips_updated_at ON public.ifta_trips;
CREATE TRIGGER update_ifta_trips_updated_at BEFORE UPDATE ON public.ifta_trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2) ifta_fuel_purchases — gallons + tax paid per jurisdiction
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ifta_fuel_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,

  purchase_date date NOT NULL,
  quarter text NOT NULL,
  jurisdiction text NOT NULL, -- US state code or CA province code
  gallons numeric(10, 3) NOT NULL,
  gross_price numeric(12, 2),

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
CREATE POLICY "org members read ifta_fuel" ON public.ifta_fuel_purchases FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert ifta_fuel" ON public.ifta_fuel_purchases;
CREATE POLICY "org members insert ifta_fuel" ON public.ifta_fuel_purchases FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update ifta_fuel" ON public.ifta_fuel_purchases;
CREATE POLICY "org members update ifta_fuel" ON public.ifta_fuel_purchases FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete ifta_fuel" ON public.ifta_fuel_purchases;
CREATE POLICY "org members delete ifta_fuel" ON public.ifta_fuel_purchases FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_ifta_fuel_updated_at ON public.ifta_fuel_purchases;
CREATE TRIGGER update_ifta_fuel_updated_at BEFORE UPDATE ON public.ifta_fuel_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3) ifta_tax_rates — per-quarter, per-jurisdiction rate ($/gallon)
--    These change quarterly; agency populates via admin UI. Shared across the
--    whole org for that quarter (no client-specific overrides).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ifta_tax_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  quarter text NOT NULL,
  jurisdiction text NOT NULL,
  rate_per_gallon numeric(10, 5) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ifta_rates_org_quarter_juris
  ON public.ifta_tax_rates(org_id, quarter, jurisdiction);

ALTER TABLE public.ifta_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifta_tax_rates ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP POLICY IF EXISTS "org members read ifta_rates" ON public.ifta_tax_rates;
CREATE POLICY "org members read ifta_rates" ON public.ifta_tax_rates FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members write ifta_rates" ON public.ifta_tax_rates;
CREATE POLICY "org members write ifta_rates" ON public.ifta_tax_rates FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete ifta_rates" ON public.ifta_tax_rates;
CREATE POLICY "org members delete ifta_rates" ON public.ifta_tax_rates FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- 4) ifta_filings — one snapshot per client per quarter
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ifta_filings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,

  quarter text NOT NULL,
  total_miles numeric(12, 2),
  total_gallons numeric(12, 3),
  fleet_mpg numeric(8, 4),
  -- jsonb: { "TX": { taxable_miles, taxable_gallons, tax_paid, tax_owed }, ... }
  breakdown_by_jurisdiction jsonb,
  total_tax_due numeric(12, 2),

  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'filed', 'paid')),
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
CREATE POLICY "org members read ifta_filings" ON public.ifta_filings FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert ifta_filings" ON public.ifta_filings;
CREATE POLICY "org members insert ifta_filings" ON public.ifta_filings FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update ifta_filings" ON public.ifta_filings;
CREATE POLICY "org members update ifta_filings" ON public.ifta_filings FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_ifta_filings_updated_at ON public.ifta_filings;
CREATE TRIGGER update_ifta_filings_updated_at BEFORE UPDATE ON public.ifta_filings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
