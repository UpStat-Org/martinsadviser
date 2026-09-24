-- Supabase installs pgcrypto in the `extensions` schema. The initial function
-- had a restricted search_path and therefore could not resolve digest().
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
  VALUES (v_org_id, p_load_id, encode(extensions.digest(v_token, 'sha256'), 'hex'), p_expires_at, auth.uid())
  RETURNING id INTO v_link_id;

  RETURN jsonb_build_object('id', v_link_id, 'token', v_token, 'expires_at', p_expires_at);
END;
$$;
