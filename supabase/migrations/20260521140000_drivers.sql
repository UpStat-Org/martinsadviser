-- ============================================================================
-- Drivers — foundational entity for DQF and drug-testing pool
--
-- A client (carrier) employs N drivers. Each driver has a CDL, a medical
-- card, and a stream of compliance documents (MVR, drug tests, employment
-- verification, road test, etc.) tracked separately in driver_documents and
-- drug_test_events.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,

  -- Identity
  full_name text NOT NULL,
  date_of_birth date,
  ssn_last4 text, -- never store full SSN; last 4 is enough for matching
  phone text,
  email text,

  -- CDL
  cdl_number text,
  cdl_state text,
  cdl_class text CHECK (cdl_class IN ('A', 'B', 'C') OR cdl_class IS NULL),
  cdl_endorsements text, -- comma-separated codes: H, N, P, S, T, X
  cdl_issued_on date,
  cdl_expires_on date,

  -- Medical exam (DOT physical)
  medical_card_expires_on date,
  medical_examiner_name text,

  -- Employment
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
CREATE POLICY "org members read drivers"
  ON public.drivers FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org members insert drivers" ON public.drivers;
CREATE POLICY "org members insert drivers"
  ON public.drivers FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "org members update drivers" ON public.drivers;
CREATE POLICY "org members update drivers"
  ON public.drivers FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org members delete drivers" ON public.drivers;
CREATE POLICY "org members delete drivers"
  ON public.drivers FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

ALTER TABLE public.drivers
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

-- updated_at trigger uses the existing helper.
DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
