-- ============================================================================
-- Rebrand: MartinsAdviser → DotPilot
--
-- The platform is no longer a single-company tool; the operator brand is now
-- DotPilot and the platform domain moves to dotpilot.online. Four things in the
-- database embed the old brand and need updating:
--
--   1. The master org row (id …0001): name, slug and branding strings.
--   2. organization_domains.verification_token DEFAULT — new tokens use the
--      "dotpilot-verify=" prefix (existing rows keep their old token; the
--      verify-domain function reads the stored token, so they still verify).
--   3. get_org_by_hostname — subdomain routing now matches *.dotpilot.online.
--   4. request_org_domain — rejects dotpilot.online hostnames as custom domains.
--   5. handle_new_user — reserved-slug list gains 'dotpilot' (we keep
--      'martinsadviser' reserved too so nobody can squat the old slug).
-- ============================================================================

-- 1. Master org row --------------------------------------------------------
UPDATE public.organizations
   SET name = 'DotPilot',
       slug = 'dotpilot',
       branding = branding
                  || jsonb_build_object(
                       'app_name', 'DotPilot',
                       'tagline',  'Pilot'
                     )
 WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
   AND slug = 'martinsadviser';

-- 2. Verification-token prefix for new custom domains -----------------------
ALTER TABLE public.organization_domains
  ALTER COLUMN verification_token
  SET DEFAULT ('dotpilot-verify=' || encode(gen_random_bytes(18), 'hex'));

-- 3. Hostname → org resolver -------------------------------------------------
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
     WHERE hostname ~ '^[^.]+\.dotpilot\.online$'
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

-- 4. Custom-domain registration ----------------------------------------------
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

  IF v_domain = 'dotpilot.online' OR v_domain LIKE '%.dotpilot.online' THEN
    RAISE EXCEPTION 'Use the organization slug for dotpilot.online subdomains';
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

-- 5. Signup trigger: reserved slugs ------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_org_id constant uuid := '00000000-0000-0000-0000-000000000001';
  v_intent  text := NEW.raw_user_meta_data->>'intent';
  v_slug    text := lower(trim(coalesce(NEW.raw_user_meta_data->>'slug', '')));
  v_name    text := trim(coalesce(NEW.raw_user_meta_data->>'org_name', ''));
  v_country text := upper(trim(coalesce(NEW.raw_user_meta_data->>'country', 'US')));
  v_org_id  uuid;
BEGIN
  -- --------------------------------------------------------------------
  -- Path A: self-serve "create my own org".
  -- --------------------------------------------------------------------
  IF v_intent = 'new-org' THEN
    IF v_slug = '' OR length(v_slug) < 2 OR v_slug !~ '^[a-z0-9][a-z0-9-]*$' THEN
      RAISE EXCEPTION 'invalid slug: %', v_slug;
    END IF;
    IF v_slug IN ('www','app','api','admin','status','dotpilot','martinsadviser') THEN
      RAISE EXCEPTION 'slug % is reserved', v_slug;
    END IF;
    IF v_name = '' THEN
      RAISE EXCEPTION 'org_name is required';
    END IF;
    IF v_country NOT IN ('US','BR','ES') THEN
      RAISE EXCEPTION 'country must be US, BR or ES';
    END IF;
    IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = v_slug) THEN
      RAISE EXCEPTION 'slug % is already taken', v_slug;
    END IF;

    INSERT INTO public.organizations (slug, name, subscription_status)
    VALUES (v_slug, v_name, 'trialing')
    RETURNING id INTO v_org_id;

    INSERT INTO public.profiles (id, email, full_name, approval_status, active_org_id)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'approved',
      v_org_id
    );

    INSERT INTO public.organization_members (organization_id, user_id, role, approval_status)
    VALUES (v_org_id, NEW.id, 'owner', 'approved');

    RETURN NEW;
  END IF;

  -- --------------------------------------------------------------------
  -- Path C: portal user (provisioned by create-portal-user edge function).
  -- The real link lives in client_portal_users(user_id, client_id, org_id);
  -- they must NOT appear in organization_members or any tenant will see
  -- them in /admin/users.
  -- --------------------------------------------------------------------
  IF v_intent = 'portal-user' THEN
    INSERT INTO public.profiles (id, email, full_name, approval_status, active_org_id)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'approved',
      NULL
    );
    RETURN NEW;
  END IF;

  -- --------------------------------------------------------------------
  -- Path B (default): legacy single-tenant signup or invited-by-an-existing-org.
  -- --------------------------------------------------------------------
  INSERT INTO public.profiles (id, email, full_name, approval_status, active_org_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'pending',
    default_org_id
  );

  INSERT INTO public.organization_members (organization_id, user_id, role, approval_status)
  VALUES (default_org_id, NEW.id, 'member', 'pending')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
