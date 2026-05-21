-- ============================================================================
-- Driver Qualification File (DQF) + Drug testing pool
--
-- Two related tables built on top of `drivers` (migration 20260521140000):
--
-- 1) driver_documents — discrete DQF documents per driver, each with its own
--    expiration. The kind enum covers the FMCSA-mandated DQF contents:
--    application, MVR (annual), road test certificate, employment
--    verification, medical exam certificate, drug test result, training, and
--    a catch-all "other".
--
-- 2) drug_test_events — every drug/alcohol test event for a driver. Random
--    selections from the quarterly pool, plus pre-employment, post-accident,
--    reasonable-suspicion, return-to-duty and follow-up. Captures the result
--    and the MRO review timestamp.
--
-- Pool membership is just "driver.status = active AND has a CDL". No
-- separate pool table — the agency draws a random sample each quarter from
-- the active CDL drivers per client (or pooled across clients, depending on
-- their preference; that policy is enforced in the app, not the schema).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) driver_documents
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.driver_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,

  kind text NOT NULL CHECK (kind IN (
    'application',
    'mvr',                -- Motor Vehicle Record, must be obtained annually
    'road_test',
    'employment_verification',
    'medical_exam',
    'drug_test',
    'training',
    'other'
  )),

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
CREATE POLICY "org members read driver_documents"
  ON public.driver_documents FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org members insert driver_documents" ON public.driver_documents;
CREATE POLICY "org members insert driver_documents"
  ON public.driver_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "org members update driver_documents" ON public.driver_documents;
CREATE POLICY "org members update driver_documents"
  ON public.driver_documents FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org members delete driver_documents" ON public.driver_documents;
CREATE POLICY "org members delete driver_documents"
  ON public.driver_documents FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

ALTER TABLE public.driver_documents
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP TRIGGER IF EXISTS update_driver_documents_updated_at ON public.driver_documents;
CREATE TRIGGER update_driver_documents_updated_at
  BEFORE UPDATE ON public.driver_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2) drug_test_events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.drug_test_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,

  test_type text NOT NULL CHECK (test_type IN (
    'pre_employment',
    'random',
    'post_accident',
    'reasonable_suspicion',
    'return_to_duty',
    'follow_up'
  )),
  substance text NOT NULL DEFAULT 'drug' CHECK (substance IN ('drug', 'alcohol')),

  -- Selection: when the agency drew this driver for a random test (NULL for
  -- non-random tests). Random pool selections aren't yet "scheduled" — the
  -- selection_for_quarter lets us track 50%/10% annual coverage.
  selection_for_quarter text, -- e.g. '2026-Q2'

  scheduled_for date,
  collected_at timestamptz,
  result text CHECK (result IN ('pending', 'negative', 'positive', 'refused', 'cancelled') OR result IS NULL),
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
CREATE POLICY "org members read drug_test_events"
  ON public.drug_test_events FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org members insert drug_test_events" ON public.drug_test_events;
CREATE POLICY "org members insert drug_test_events"
  ON public.drug_test_events FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "org members update drug_test_events" ON public.drug_test_events;
CREATE POLICY "org members update drug_test_events"
  ON public.drug_test_events FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org members delete drug_test_events" ON public.drug_test_events;
CREATE POLICY "org members delete drug_test_events"
  ON public.drug_test_events FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

ALTER TABLE public.drug_test_events
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

DROP TRIGGER IF EXISTS update_drug_test_events_updated_at ON public.drug_test_events;
CREATE TRIGGER update_drug_test_events_updated_at
  BEFORE UPDATE ON public.drug_test_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
