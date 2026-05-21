-- ============================================================================
-- Insurance Certificates (COI) per client
--
-- Carriers must maintain liability insurance (BMC-91 form, $750k-$5M depending
-- on cargo) and cargo insurance. Filings are made by the insurer with FMCSA.
-- The agency tracks the underlying policies + expiration so they can chase
-- the carrier ahead of lapse.
--
-- Multiple policies per client (general liability, cargo, physical damage,
-- workers comp, etc.). Each has its own term.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.insurance_certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,

  policy_type text NOT NULL CHECK (policy_type IN (
    'liability',
    'cargo',
    'physical_damage',
    'general_liability',
    'workers_comp',
    'umbrella',
    'other'
  )),
  policy_number text,
  insurer_name text,
  coverage_amount numeric(14, 2),
  effective_date date,
  expiration_date date,
  document_url text,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurance_client ON public.insurance_certificates(client_id);
CREATE INDEX IF NOT EXISTS idx_insurance_org_id ON public.insurance_certificates(org_id);
CREATE INDEX IF NOT EXISTS idx_insurance_expiration ON public.insurance_certificates(expiration_date);

ALTER TABLE public.insurance_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_certificates ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP POLICY IF EXISTS "org members read insurance" ON public.insurance_certificates;
CREATE POLICY "org members read insurance" ON public.insurance_certificates FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert insurance" ON public.insurance_certificates;
CREATE POLICY "org members insert insurance" ON public.insurance_certificates FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update insurance" ON public.insurance_certificates;
CREATE POLICY "org members update insurance" ON public.insurance_certificates FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete insurance" ON public.insurance_certificates;
CREATE POLICY "org members delete insurance" ON public.insurance_certificates FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_insurance_updated_at ON public.insurance_certificates;
CREATE TRIGGER update_insurance_updated_at BEFORE UPDATE ON public.insurance_certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
