-- ============================================================================
-- Roadside inspections + Accident register
--
-- Two FMCSA-required records that feed into a carrier's CSA score:
--
-- roadside_inspections: DOT officer pulled the truck over (or terminal/scale
--   inspection). Level 1-6 indicates depth — Level 1 is the full North
--   American Standard Inspection. Violations turn into CSA points.
--
-- accidents: every reportable accident must be kept in the accident register
--   for 3 years (49 CFR §390.15). Reportable = death OR injury requiring
--   transport OR vehicle towed away OR disabling damage.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- roadside_inspections
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.roadside_inspections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,

  inspection_date date NOT NULL,
  location text,
  state text,
  inspector_id text,
  inspection_level integer CHECK (inspection_level BETWEEN 1 AND 6),
  result text NOT NULL CHECK (result IN ('clean', 'violations', 'oos')),
  csa_points integer NOT NULL DEFAULT 0,
  violations jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ code, description, oos }, ...]
  report_number text,
  document_url text,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roadside_client ON public.roadside_inspections(client_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_roadside_truck ON public.roadside_inspections(truck_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_roadside_driver ON public.roadside_inspections(driver_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_roadside_org_id ON public.roadside_inspections(org_id);

ALTER TABLE public.roadside_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadside_inspections ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP POLICY IF EXISTS "org members read roadside" ON public.roadside_inspections;
CREATE POLICY "org members read roadside" ON public.roadside_inspections FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert roadside" ON public.roadside_inspections;
CREATE POLICY "org members insert roadside" ON public.roadside_inspections FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update roadside" ON public.roadside_inspections;
CREATE POLICY "org members update roadside" ON public.roadside_inspections FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete roadside" ON public.roadside_inspections;
CREATE POLICY "org members delete roadside" ON public.roadside_inspections FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_roadside_updated_at ON public.roadside_inspections;
CREATE TRIGGER update_roadside_updated_at BEFORE UPDATE ON public.roadside_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- accidents
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.accidents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,

  occurred_at timestamptz NOT NULL,
  location text,
  state text,

  -- §390.5 reportability criteria
  fatalities integer NOT NULL DEFAULT 0,
  injuries integer NOT NULL DEFAULT 0,
  tow_required boolean NOT NULL DEFAULT false,
  usdot_reportable boolean GENERATED ALWAYS AS (
    fatalities > 0 OR injuries > 0 OR tow_required = true
  ) STORED,

  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'fatal')),
  fmcsa_report_number text,
  police_report_number text,
  narrative text,
  document_url text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accidents_client ON public.accidents(client_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_accidents_truck ON public.accidents(truck_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_accidents_driver ON public.accidents(driver_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_accidents_org_id ON public.accidents(org_id);

ALTER TABLE public.accidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accidents ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP POLICY IF EXISTS "org members read accidents" ON public.accidents;
CREATE POLICY "org members read accidents" ON public.accidents FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert accidents" ON public.accidents;
CREATE POLICY "org members insert accidents" ON public.accidents FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update accidents" ON public.accidents;
CREATE POLICY "org members update accidents" ON public.accidents FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete accidents" ON public.accidents;
CREATE POLICY "org members delete accidents" ON public.accidents FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_accidents_updated_at ON public.accidents;
CREATE TRIGGER update_accidents_updated_at BEFORE UPDATE ON public.accidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
