-- ============================================================================
-- Hours of Service (HOS) violations log
--
-- 49 CFR §395 governs property-carrying CMV driver HOS. Common violations:
--
--   - 11-hour driving limit
--   - 14-hour on-duty limit
--   - 30-minute break requirement
--   - 60/70-hour weekly limit
--   - Logbook / RODS errors
--
-- Real-world data ideally comes from an ELD vendor (Motive, Samsara,
-- KeepTruckin). Each vendor has its own OAuth + webhook story — out of
-- scope for this iteration. This table is the destination for both manual
-- agency entry and a future ELD integration.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hos_violations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,

  occurred_at timestamptz NOT NULL,
  rule_violated text NOT NULL CHECK (rule_violated IN (
    'driving_11h',
    'on_duty_14h',
    'break_30min',
    'weekly_60h',
    'weekly_70h',
    'logbook_error',
    'other'
  )),
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'serious', 'critical')),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'eld_motive', 'eld_samsara', 'eld_keep_truckin', 'fmcsa_inspection')),

  resolved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hos_violations_driver ON public.hos_violations(driver_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_hos_violations_org_id ON public.hos_violations(org_id);

ALTER TABLE public.hos_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hos_violations ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP POLICY IF EXISTS "org members read hos" ON public.hos_violations;
CREATE POLICY "org members read hos" ON public.hos_violations FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert hos" ON public.hos_violations;
CREATE POLICY "org members insert hos" ON public.hos_violations FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update hos" ON public.hos_violations;
CREATE POLICY "org members update hos" ON public.hos_violations FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete hos" ON public.hos_violations;
CREATE POLICY "org members delete hos" ON public.hos_violations FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_hos_violations_updated_at ON public.hos_violations;
CREATE TRIGGER update_hos_violations_updated_at BEFORE UPDATE ON public.hos_violations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
