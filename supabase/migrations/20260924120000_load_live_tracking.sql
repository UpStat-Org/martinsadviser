-- Live location sharing for loads.
--
-- A driver receives only the opaque token returned by
-- create_load_tracking_link(). The database stores its SHA-256 hash, never
-- the usable link. Public browsers cannot read either table directly; they
-- submit positions through the load-tracking Edge Function after it validates
-- that token.

CREATE TABLE public.load_tracking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT public.current_org_id()
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  load_id uuid NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  driver_name text,
  started_at timestamptz,
  stopped_at timestamptz,
  last_seen_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX load_tracking_links_load_idx ON public.load_tracking_links(load_id, created_at DESC);
CREATE INDEX load_tracking_links_active_idx
  ON public.load_tracking_links(org_id, status, expires_at)
  WHERE status = 'active';

CREATE TABLE public.load_tracking_positions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tracking_link_id uuid NOT NULL REFERENCES public.load_tracking_links(id) ON DELETE CASCADE,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_m double precision CHECK (accuracy_m IS NULL OR accuracy_m >= 0),
  heading double precision CHECK (heading IS NULL OR heading BETWEEN 0 AND 360),
  speed_mps double precision CHECK (speed_mps IS NULL OR speed_mps >= 0),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX load_tracking_positions_link_recorded_idx
  ON public.load_tracking_positions(tracking_link_id, recorded_at DESC);

ALTER TABLE public.load_tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_tracking_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read load tracking links"
  ON public.load_tracking_links FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "org members update load tracking links"
  ON public.load_tracking_links FOR UPDATE TO authenticated
  USING (public.can_org_write(org_id))
  WITH CHECK (public.can_org_write(org_id));

CREATE POLICY "org members read load tracking positions"
  ON public.load_tracking_positions FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE TRIGGER update_load_tracking_links_updated_at
  BEFORE UPDATE ON public.load_tracking_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Returns a one-time, high-entropy token to the authenticated organization
-- member. The raw token is intentionally not persisted.
CREATE OR REPLACE FUNCTION public.create_load_tracking_link(
  p_load_id uuid,
  p_expires_at timestamptz DEFAULT (now() + interval '12 hours')
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_token text;
  v_link_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT org_id INTO v_org_id FROM public.loads WHERE id = p_load_id;
  IF v_org_id IS NULL OR NOT public.can_org_write(v_org_id) THEN
    RAISE EXCEPTION 'Load not found';
  END IF;
  IF p_expires_at <= now() OR p_expires_at > now() + interval '7 days' THEN
    RAISE EXCEPTION 'Expiration must be between now and seven days';
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.load_tracking_links (org_id, load_id, token_hash, expires_at, created_by)
  VALUES (v_org_id, p_load_id, encode(digest(v_token, 'sha256'), 'hex'), p_expires_at, auth.uid())
  RETURNING id INTO v_link_id;

  RETURN jsonb_build_object('id', v_link_id, 'token', v_token, 'expires_at', p_expires_at);
END;
$$;

REVOKE ALL ON FUNCTION public.create_load_tracking_link(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_load_tracking_link(uuid, timestamptz) TO authenticated;
