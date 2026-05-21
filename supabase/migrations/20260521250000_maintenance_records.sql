-- ============================================================================
-- Vehicle maintenance log per truck
--
-- 49 CFR §396 requires carriers to keep periodic inspection, maintenance and
-- lubrication records for each CMV for the prior 12 months (extended to 6
-- months after disposal). The DOT Annual Inspection (a.k.a. PM or Periodic
-- Maintenance) is the most-tracked entry — it's the one DOT officers ask for
-- during a roadside inspection.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  truck_id uuid NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,

  service_date date NOT NULL,
  service_type text NOT NULL CHECK (service_type IN (
    'dot_annual_inspection',
    'oil_change',
    'brake_service',
    'tire_service',
    'engine_repair',
    'transmission_service',
    'preventive_maintenance',
    'electrical',
    'other'
  )),
  mileage integer,
  vendor text,
  cost numeric(12, 2),
  next_due_at date,
  document_url text,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_truck ON public.maintenance_records(truck_id, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_org_id ON public.maintenance_records(org_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_next_due_at ON public.maintenance_records(next_due_at);

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP POLICY IF EXISTS "org members read maintenance" ON public.maintenance_records;
CREATE POLICY "org members read maintenance" ON public.maintenance_records FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert maintenance" ON public.maintenance_records;
CREATE POLICY "org members insert maintenance" ON public.maintenance_records FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update maintenance" ON public.maintenance_records;
CREATE POLICY "org members update maintenance" ON public.maintenance_records FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete maintenance" ON public.maintenance_records;
CREATE POLICY "org members delete maintenance" ON public.maintenance_records FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_maintenance_updated_at ON public.maintenance_records;
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
