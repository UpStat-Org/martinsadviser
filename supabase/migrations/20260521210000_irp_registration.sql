-- ============================================================================
-- IRP (International Registration Plan) — apportioned plate registration
--
-- An IRP registration is one record per carrier per registration year. The
-- carrier reports total fleet miles + per-jurisdiction miles for the prior
-- reporting period (Jul-Jun); the base jurisdiction calculates fees
-- proportional to mileage and remits to the other jurisdictions.
--
-- Schema:
--   irp_registrations          — one row per (client, registration_year).
--                                Holds base jurisdiction, totals, status.
--   irp_jurisdiction_lines     — one row per jurisdiction in the registration.
--                                Holds miles, percentage, calculated fee.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.irp_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,

  registration_year integer NOT NULL,   -- registration year (Apr N → Mar N+1)
  base_jurisdiction text NOT NULL,
  total_fleet_miles numeric(14, 2) NOT NULL DEFAULT 0,
  fleet_size integer NOT NULL DEFAULT 0,

  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'filed', 'paid')),
  filed_at date,
  total_fee numeric(12, 2),
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_irp_registrations_client_year
  ON public.irp_registrations(client_id, registration_year);
CREATE INDEX IF NOT EXISTS idx_irp_registrations_org_id ON public.irp_registrations(org_id);

ALTER TABLE public.irp_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irp_registrations ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP POLICY IF EXISTS "org members read irp_reg" ON public.irp_registrations;
CREATE POLICY "org members read irp_reg" ON public.irp_registrations FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert irp_reg" ON public.irp_registrations;
CREATE POLICY "org members insert irp_reg" ON public.irp_registrations FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update irp_reg" ON public.irp_registrations;
CREATE POLICY "org members update irp_reg" ON public.irp_registrations FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete irp_reg" ON public.irp_registrations;
CREATE POLICY "org members delete irp_reg" ON public.irp_registrations FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_irp_registrations_updated_at ON public.irp_registrations;
CREATE TRIGGER update_irp_registrations_updated_at BEFORE UPDATE ON public.irp_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Jurisdiction lines — one per state/province in the apportionment.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.irp_jurisdiction_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  registration_id uuid NOT NULL REFERENCES public.irp_registrations(id) ON DELETE CASCADE,
  jurisdiction text NOT NULL,
  miles numeric(14, 2) NOT NULL DEFAULT 0,
  percentage numeric(7, 4),   -- miles / total_fleet_miles
  fee numeric(12, 2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_irp_lines_reg_juris
  ON public.irp_jurisdiction_lines(registration_id, jurisdiction);
CREATE INDEX IF NOT EXISTS idx_irp_lines_org_id ON public.irp_jurisdiction_lines(org_id);

ALTER TABLE public.irp_jurisdiction_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irp_jurisdiction_lines ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP POLICY IF EXISTS "org members read irp_lines" ON public.irp_jurisdiction_lines;
CREATE POLICY "org members read irp_lines" ON public.irp_jurisdiction_lines FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert irp_lines" ON public.irp_jurisdiction_lines;
CREATE POLICY "org members insert irp_lines" ON public.irp_jurisdiction_lines FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members update irp_lines" ON public.irp_jurisdiction_lines;
CREATE POLICY "org members update irp_lines" ON public.irp_jurisdiction_lines FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete irp_lines" ON public.irp_jurisdiction_lines;
CREATE POLICY "org members delete irp_lines" ON public.irp_jurisdiction_lines FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));
