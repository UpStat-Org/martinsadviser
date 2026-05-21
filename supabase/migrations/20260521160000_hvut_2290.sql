-- ============================================================================
-- Form 2290 (HVUT) tracking
--
-- The Heavy Vehicle Use Tax (IRS Form 2290) is paid annually per vehicle with
-- a taxable gross weight of 55,000 lbs or more. Tax year runs July → June.
-- A filing is due by the last day of the month after the first month a
-- vehicle is used on public highways (vehicles in continuous service start
-- their year in July → due August 31).
--
-- Tax amounts (2024 rates, no anniversary update needed annually):
--   - < 55,000 lbs              → exempt
--   - 55,000 lbs                → $100
--   - 55,001 to 75,000 lbs      → $100 + $22 per 1,000 lbs over 55,000
--   - > 75,000 lbs              → $550 (capped)
--
-- A vehicle expected to be driven ≤ 5,000 miles (7,500 for agricultural) in
-- the tax year files as "suspended" and pays no tax — that's captured by
-- `suspended = true`.
-- ============================================================================

-- Add weight to trucks so the tax calculation has a default.
ALTER TABLE public.trucks
  ADD COLUMN IF NOT EXISTS taxable_gross_weight_lbs integer;

COMMENT ON COLUMN public.trucks.taxable_gross_weight_lbs IS
  'Combined taxable gross weight (chassis + body + permanently attached equipment + max customary load) in pounds. Drives HVUT 2290 tax calculation.';

CREATE TABLE IF NOT EXISTS public.hvut_filings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  truck_id uuid NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,

  -- Tax year identifier. Tax year 2026 covers July 2026 → June 2027.
  tax_year integer NOT NULL,
  -- Month-year the truck was first used in this tax year. Determines the
  -- pro-rated tax amount when first-use isn't July.
  first_used_month text, -- e.g. '2026-07'

  taxable_gross_weight_lbs integer,
  suspended boolean NOT NULL DEFAULT false,
  tax_amount numeric(12, 2),

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filed', 'paid', 'amended')),
  filed_at date,
  irs_confirmation text,
  schedule_1_url text, -- IRS stamped Schedule 1 (proof of payment) stored externally
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hvut_filings_truck_id ON public.hvut_filings(truck_id);
CREATE INDEX IF NOT EXISTS idx_hvut_filings_org_id ON public.hvut_filings(org_id);
CREATE INDEX IF NOT EXISTS idx_hvut_filings_tax_year ON public.hvut_filings(tax_year);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hvut_filings_truck_year
  ON public.hvut_filings(truck_id, tax_year);

ALTER TABLE public.hvut_filings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members read hvut" ON public.hvut_filings;
CREATE POLICY "org members read hvut"
  ON public.hvut_filings FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org members insert hvut" ON public.hvut_filings;
CREATE POLICY "org members insert hvut"
  ON public.hvut_filings FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "org members update hvut" ON public.hvut_filings;
CREATE POLICY "org members update hvut"
  ON public.hvut_filings FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org members delete hvut" ON public.hvut_filings;
CREATE POLICY "org members delete hvut"
  ON public.hvut_filings FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

ALTER TABLE public.hvut_filings
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP TRIGGER IF EXISTS update_hvut_filings_updated_at ON public.hvut_filings;
CREATE TRIGGER update_hvut_filings_updated_at
  BEFORE UPDATE ON public.hvut_filings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
