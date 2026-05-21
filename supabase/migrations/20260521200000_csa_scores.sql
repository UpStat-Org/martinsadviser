-- ============================================================================
-- CSA BASIC scores tracking
--
-- The FMCSA Safety Measurement System (SMS) publishes 7 BASIC scores per
-- motor carrier monthly:
--
--   1. Unsafe Driving           (UD)
--   2. Hours-of-Service Compliance (HOS)
--   3. Driver Fitness            (DF)
--   4. Controlled Substances/Alcohol (CSA-DA)
--   5. Vehicle Maintenance       (VM)
--   6. Hazmat Compliance         (HM)
--   7. Crash Indicator           (CI)
--
-- Each score is 0-100. Intervention thresholds are public per BASIC and
-- carrier operation type; we store them as constants in the lib, not in the
-- DB, so they can be updated without a migration.
--
-- One row per client per measurement period. Manual entry MVP — when an
-- FMCSA SMS scrape becomes available, it just calls the same insert.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.csa_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,

  measurement_period date NOT NULL, -- first day of the SMS month, e.g. 2026-04-01

  unsafe_driving numeric(5, 2),
  hours_of_service numeric(5, 2),
  driver_fitness numeric(5, 2),
  controlled_substances numeric(5, 2),
  vehicle_maintenance numeric(5, 2),
  hazmat_compliance numeric(5, 2),
  crash_indicator numeric(5, 2),

  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_csa_snapshots_client_period
  ON public.csa_snapshots(client_id, measurement_period);
CREATE INDEX IF NOT EXISTS idx_csa_snapshots_org_id ON public.csa_snapshots(org_id);

ALTER TABLE public.csa_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csa_snapshots ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP POLICY IF EXISTS "org members read csa_snapshots" ON public.csa_snapshots;
CREATE POLICY "org members read csa_snapshots"
  ON public.csa_snapshots FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org members insert csa_snapshots" ON public.csa_snapshots;
CREATE POLICY "org members insert csa_snapshots"
  ON public.csa_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "org members update csa_snapshots" ON public.csa_snapshots;
CREATE POLICY "org members update csa_snapshots"
  ON public.csa_snapshots FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org members delete csa_snapshots" ON public.csa_snapshots;
CREATE POLICY "org members delete csa_snapshots"
  ON public.csa_snapshots FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));
