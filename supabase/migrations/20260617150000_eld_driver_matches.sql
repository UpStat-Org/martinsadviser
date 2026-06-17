-- ELD driver matching
--
-- eld-sync resolves provider drivers against our `drivers` table by email/name.
-- When an ELD driver has no local match its HOS violations would be dropped, so
-- instead we record the unmatched identity here. The Drivers hub surfaces these
-- rows and lets an operator link them to an existing driver, create a new one,
-- or ignore the identity. Once `status='linked'`, eld-sync imports straight to
-- the mapped driver; `status='ignored'` is skipped silently.
--
-- `external_key` is the normalized identity eld-sync keys on: lower(email) when
-- present, else lower(full name). Unique per (org, provider) so re-runs refresh
-- the same row (last_seen / pending count) rather than duplicating it.

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_eld_driver_matches_key
  ON public.eld_driver_matches(org_id, provider, external_key);
CREATE INDEX IF NOT EXISTS idx_eld_driver_matches_org_status
  ON public.eld_driver_matches(org_id, status);

ALTER TABLE public.eld_driver_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eld_driver_matches
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

-- Rows are written by eld-sync (service role, bypasses RLS). Org members read
-- and resolve (link/ignore) them; no client-side insert/delete is needed.
DROP POLICY IF EXISTS "org members read eld matches" ON public.eld_driver_matches;
CREATE POLICY "org members read eld matches"
  ON public.eld_driver_matches FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org members update eld matches" ON public.eld_driver_matches;
CREATE POLICY "org members update eld matches"
  ON public.eld_driver_matches FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));
