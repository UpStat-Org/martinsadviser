-- Driver compliance automation flag
ALTER TABLE public.compliance_automation_settings
  ADD COLUMN IF NOT EXISTS driver_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.compliance_automation_settings.driver_enabled IS
  'When true, generate-compliance-tasks opens tasks for CDL renewals, medical card renewals and annual MVR pulls inside the org lead window.';

-- ELD driver matches
CREATE TABLE IF NOT EXISTS public.eld_driver_matches (
  id                 uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id             uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider           text NOT NULL CHECK (provider IN ('motive', 'samsara')),
  external_key       text NOT NULL,
  external_email     text,
  external_name      text,
  driver_id          uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  status             text NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'linked', 'ignored')),
  violations_pending integer NOT NULL DEFAULT 0,
  last_seen_at       timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.eld_driver_matches TO authenticated;
GRANT ALL ON public.eld_driver_matches TO service_role;

ALTER TABLE public.eld_driver_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eld_driver_matches
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE UNIQUE INDEX IF NOT EXISTS uq_eld_driver_matches_key
  ON public.eld_driver_matches(org_id, provider, external_key);
CREATE INDEX IF NOT EXISTS idx_eld_driver_matches_org_status
  ON public.eld_driver_matches(org_id, status);

DROP POLICY IF EXISTS "org members read eld matches" ON public.eld_driver_matches;
CREATE POLICY "org members read eld matches"
  ON public.eld_driver_matches FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org members update eld matches" ON public.eld_driver_matches;
CREATE POLICY "org members update eld matches"
  ON public.eld_driver_matches FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE TRIGGER update_eld_driver_matches_updated_at
  BEFORE UPDATE ON public.eld_driver_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();