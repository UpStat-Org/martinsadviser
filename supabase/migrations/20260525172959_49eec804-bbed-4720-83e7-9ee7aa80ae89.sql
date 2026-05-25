CREATE TABLE IF NOT EXISTS public.organization_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain text NOT NULL,
  verification_token text NOT NULL DEFAULT ('martinsadviser-verify=' || encode(gen_random_bytes(18), 'hex')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'disabled')),
  verified_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_domains_domain_format
    CHECK (
      domain = lower(domain)
      AND domain !~ '^https?://'
      AND domain !~ '/'
      AND domain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_domains_domain_unique
  ON public.organization_domains (domain);

CREATE INDEX IF NOT EXISTS organization_domains_org_id_idx
  ON public.organization_domains (organization_id);

CREATE TRIGGER update_organization_domains_updated_at
  BEFORE UPDATE ON public.organization_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.organization_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org admins read domains"
  ON public.organization_domains FOR SELECT TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY "org admins insert domains"
  ON public.organization_domains FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "org admins update domains"
  ON public.organization_domains FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "org admins delete domains"
  ON public.organization_domains FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE OR REPLACE FUNCTION public.normalize_hostname(p_hostname text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(
    regexp_replace(
      regexp_replace(lower(trim(coalesce(p_hostname, ''))), ':\d+$', ''),
      '\.$',
      ''
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.get_org_by_hostname(p_hostname text)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  branding jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH normalized AS (
    SELECT public.normalize_hostname(p_hostname) AS hostname
  ),
  platform_slug AS (
    SELECT split_part(hostname, '.', 1) AS slug
      FROM normalized
     WHERE hostname ~ '^[^.]+\.martinsadviser\.com$'
       AND split_part(hostname, '.', 1) NOT IN ('www', 'app', 'api', 'admin', 'status')
  ),
  matched_org AS (
    SELECT o.id, o.slug, o.name, o.branding, 1 AS priority
      FROM platform_slug ps
      JOIN public.organizations o ON o.slug = ps.slug
    UNION ALL
    SELECT o.id, o.slug, o.name, o.branding, 2 AS priority
      FROM normalized n
      JOIN public.organization_domains od
        ON od.domain = n.hostname
       AND od.status = 'active'
      JOIN public.organizations o ON o.id = od.organization_id
  )
  SELECT mo.id, mo.slug, mo.name, mo.branding
    FROM matched_org mo
   ORDER BY priority
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.normalize_hostname(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_hostname(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_org_by_hostname(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_by_hostname(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_org_domain(p_org_id uuid, p_domain text)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  domain text,
  verification_token text,
  status text,
  verified_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text := public.normalize_hostname(p_domain);
  v_existing public.organization_domains%ROWTYPE;
  v_row public.organization_domains%ROWTYPE;
BEGIN
  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Not authorized to manage domains for this organization';
  END IF;

  IF v_domain IS NULL OR v_domain !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$' THEN
    RAISE EXCEPTION 'Invalid domain';
  END IF;

  IF v_domain = 'martinsadviser.com' OR v_domain LIKE '%.martinsadviser.com' THEN
    RAISE EXCEPTION 'Use the organization slug for martinsadviser.com subdomains';
  END IF;

  SELECT * INTO v_existing
    FROM public.organization_domains od
   WHERE od.domain = v_domain
   LIMIT 1;

  IF FOUND AND v_existing.organization_id <> p_org_id THEN
    RAISE EXCEPTION 'Domain is already registered';
  END IF;

  IF FOUND THEN
    UPDATE public.organization_domains od
       SET status = CASE WHEN od.status = 'disabled' THEN 'pending' ELSE od.status END,
           last_checked_at = NULL
     WHERE od.id = v_existing.id
     RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.organization_domains (organization_id, domain, status)
    VALUES (p_org_id, v_domain, 'pending')
    RETURNING * INTO v_row;
  END IF;

  RETURN QUERY SELECT
    v_row.id,
    v_row.organization_id,
    v_row.domain,
    v_row.verification_token,
    v_row.status,
    v_row.verified_at,
    v_row.last_checked_at,
    v_row.created_at,
    v_row.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.request_org_domain(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_org_domain(uuid, text) TO authenticated;