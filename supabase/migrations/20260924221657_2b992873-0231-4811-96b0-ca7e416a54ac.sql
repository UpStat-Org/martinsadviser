-- 20260824120000_org_country_currency.sql
CREATE OR REPLACE FUNCTION public.default_currency_for_country(p_country text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE upper(coalesce(p_country, 'US'))
           WHEN 'BR' THEN 'BRL'
           WHEN 'ES' THEN 'EUR'
           ELSE 'USD'
         END;
$$;

CREATE OR REPLACE FUNCTION public.default_locale_for_country(p_country text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE upper(coalesce(p_country, 'US'))
           WHEN 'BR' THEN 'pt'
           WHEN 'ES' THEN 'es'
           ELSE 'en'
         END;
$$;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.organizations'::regclass
       AND conname = 'organizations_country_check'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_country_check
      CHECK (country IN ('US', 'BR', 'ES'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.organizations'::regclass
       AND conname = 'organizations_currency_check'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_currency_check
      CHECK (currency IN ('USD', 'BRL', 'EUR'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.organizations'::regclass
       AND conname = 'organizations_locale_check'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_locale_check
      CHECK (locale IN ('en', 'pt', 'es'));
  END IF;
END $$;

COMMENT ON COLUMN public.organizations.country IS
  'ISO-2. Define qual conjunto regulatório a org enxerga (US: FMCSA/DOT; BR: ANTT/DNIT).';
COMMENT ON COLUMN public.organizations.currency IS
  'ISO-4217. Moeda de faturamento e de exibição de todo valor monetário da org.';
COMMENT ON COLUMN public.organizations.locale IS
  'Idioma padrão da org: novos membros e documentos gerados server-side.';

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
  IF v_intent = 'new-org' THEN
    IF v_slug = '' OR length(v_slug) < 2 OR v_slug !~ '^[a-z0-9][a-z0-9-]*$' THEN
      RAISE EXCEPTION 'invalid slug: %', v_slug;
    END IF;
    IF v_slug IN ('www','app','api','admin','status','martinsadviser') THEN
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

    INSERT INTO public.organizations (slug, name, subscription_status, country, currency, locale)
    VALUES (
      v_slug,
      v_name,
      'trialing',
      v_country,
      public.default_currency_for_country(v_country),
      public.default_locale_for_country(v_country)
    )
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

CREATE OR REPLACE FUNCTION public.public_create_org_with_owner(
  p_slug text,
  p_name text,
  p_country text DEFAULT 'US'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_slug text := lower(trim(p_slug));
  v_name text := trim(p_name);
  v_country text := upper(trim(coalesce(p_country, 'US')));
  v_org_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'must be authenticated';
  END IF;

  IF v_slug IS NULL OR length(v_slug) < 2 THEN
    RAISE EXCEPTION 'slug must be at least 2 chars';
  END IF;
  IF v_slug !~ '^[a-z0-9][a-z0-9-]*$' THEN
    RAISE EXCEPTION 'slug must match ^[a-z0-9][a-z0-9-]*$';
  END IF;
  IF v_slug IN ('www', 'app', 'api', 'admin', 'status', 'martinsadviser') THEN
    RAISE EXCEPTION 'slug % is reserved', v_slug;
  END IF;
  IF v_name IS NULL OR length(v_name) = 0 THEN
    RAISE EXCEPTION 'name is required';
  END IF;
  IF v_country NOT IN ('US', 'BR', 'ES') THEN
    RAISE EXCEPTION 'country must be US, BR or ES';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_members
     WHERE user_id = v_uid AND role = 'owner' AND approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'caller is already an owner of an organization';
  END IF;

  INSERT INTO public.organizations (slug, name, subscription_status, country, currency, locale)
  VALUES (
    v_slug,
    v_name,
    'trialing',
    v_country,
    public.default_currency_for_country(v_country),
    public.default_locale_for_country(v_country)
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role, approval_status)
  VALUES (v_org_id, v_uid, 'owner', 'approved');

  UPDATE public.profiles
     SET active_org_id = v_org_id,
         approval_status = 'approved'
   WHERE id = v_uid;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.public_create_org_with_owner(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_create_org_with_owner(text, text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.super_admin_create_org(text, text);

CREATE OR REPLACE FUNCTION public.super_admin_create_org(
  p_slug text,
  p_name text,
  p_country text DEFAULT 'US'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text := lower(trim(p_slug));
  v_country text := upper(trim(coalesce(p_country, 'US')));
  v_id uuid;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden: super-admin only';
  END IF;

  IF v_slug IS NULL OR length(v_slug) < 2 THEN
    RAISE EXCEPTION 'slug must be at least 2 chars';
  END IF;
  IF v_slug !~ '^[a-z0-9][a-z0-9-]*$' THEN
    RAISE EXCEPTION 'slug must match ^[a-z0-9][a-z0-9-]*$';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name is required';
  END IF;
  IF v_country NOT IN ('US', 'BR', 'ES') THEN
    RAISE EXCEPTION 'country must be US, BR or ES';
  END IF;

  INSERT INTO public.organizations (slug, name, subscription_status, country, currency, locale)
  VALUES (
    v_slug,
    trim(p_name),
    'trialing',
    v_country,
    public.default_currency_for_country(v_country),
    public.default_locale_for_country(v_country)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_create_org(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_create_org(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_org_regional_settings(
  p_org_id uuid,
  p_country text,
  p_currency text,
  p_locale text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country text := upper(trim(coalesce(p_country, '')));
  v_currency text := upper(trim(coalesce(p_currency, '')));
  v_locale text := lower(trim(coalesce(p_locale, '')));
BEGIN
  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Not authorized to edit regional settings for this organization';
  END IF;

  IF v_country NOT IN ('US', 'BR', 'ES') THEN
    RAISE EXCEPTION 'country must be US, BR or ES';
  END IF;
  IF v_currency NOT IN ('USD', 'BRL', 'EUR') THEN
    RAISE EXCEPTION 'currency must be USD, BRL or EUR';
  END IF;
  IF v_locale NOT IN ('en', 'pt', 'es') THEN
    RAISE EXCEPTION 'locale must be en, pt or es';
  END IF;

  UPDATE public.organizations
     SET country = v_country,
         currency = v_currency,
         locale = v_locale
   WHERE id = p_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_org_regional_settings(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_org_regional_settings(uuid, text, text, text) TO authenticated;

-- 20260824140000_loads_dispatch.sql
CREATE OR REPLACE FUNCTION public.org_distance_unit()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE (SELECT country FROM public.organizations WHERE id = public.current_org_id())
           WHEN 'US' THEN 'mi'
           ELSE 'km'
         END;
$$;

CREATE OR REPLACE FUNCTION public.org_weight_unit()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE (SELECT country FROM public.organizations WHERE id = public.current_org_id())
           WHEN 'US' THEN 'lb'
           ELSE 'kg'
         END;
$$;

REVOKE ALL ON FUNCTION public.org_distance_unit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.org_weight_unit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_distance_unit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_weight_unit() TO authenticated;

CREATE TABLE IF NOT EXISTS public.loads (
  id             uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id         uuid NOT NULL DEFAULT public.current_org_id()
                   REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL DEFAULT auth.uid(),

  client_id      uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  truck_id       uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  driver_id      uuid REFERENCES public.drivers(id) ON DELETE SET NULL,

  invoice_id     uuid REFERENCES public.invoices(id) ON DELETE SET NULL,

  reference      text,

  status         text NOT NULL DEFAULT 'quoted'
                   CHECK (status IN ('quoted','booked','dispatched','in_transit','delivered','cancelled')),

  origin_city         text,
  origin_region       text,
  destination_city    text,
  destination_region  text,

  pickup_at      timestamptz,
  delivery_at    timestamptz,

  rate           numeric(12,2) NOT NULL DEFAULT 0,
  distance       numeric(10,2),
  distance_unit  text NOT NULL DEFAULT public.org_distance_unit()
                   CHECK (distance_unit IN ('mi','km')),
  commodity      text,
  weight         numeric(12,2),
  weight_unit    text NOT NULL DEFAULT public.org_weight_unit()
                   CHECK (weight_unit IN ('lb','kg')),

  notes          text,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loads_org ON public.loads(org_id);
CREATE INDEX IF NOT EXISTS idx_loads_client ON public.loads(client_id);
CREATE INDEX IF NOT EXISTS idx_loads_driver ON public.loads(driver_id);
CREATE INDEX IF NOT EXISTS idx_loads_truck ON public.loads(truck_id);
CREATE INDEX IF NOT EXISTS idx_loads_org_status_pickup ON public.loads(org_id, status, pickup_at);

ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read loads" ON public.loads;
CREATE POLICY "org members read loads" ON public.loads FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert loads" ON public.loads;
CREATE POLICY "org members insert loads" ON public.loads FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update loads" ON public.loads;
CREATE POLICY "org members update loads" ON public.loads FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete loads" ON public.loads;
CREATE POLICY "org members delete loads" ON public.loads FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_loads_updated_at ON public.loads;
CREATE TRIGGER update_loads_updated_at BEFORE UPDATE ON public.loads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.load_stops (
  id             uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id         uuid NOT NULL DEFAULT public.current_org_id()
                   REFERENCES public.organizations(id) ON DELETE CASCADE,
  load_id        uuid NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,

  position       integer NOT NULL DEFAULT 0,
  kind           text NOT NULL DEFAULT 'pickup'
                   CHECK (kind IN ('pickup','delivery')),

  company_name   text,
  address        text,
  city           text,
  region         text,
  postal_code    text,
  country        text,

  window_start   timestamptz,
  window_end     timestamptz,
  arrived_at     timestamptz,
  departed_at    timestamptz,

  contact_name   text,
  contact_phone  text,
  reference      text,
  notes          text,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_load_stops_org ON public.load_stops(org_id);
CREATE INDEX IF NOT EXISTS idx_load_stops_load ON public.load_stops(load_id, position);

ALTER TABLE public.load_stops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read load_stops" ON public.load_stops;
CREATE POLICY "org members read load_stops" ON public.load_stops FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert load_stops" ON public.load_stops;
CREATE POLICY "org members insert load_stops" ON public.load_stops FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members update load_stops" ON public.load_stops;
CREATE POLICY "org members update load_stops" ON public.load_stops FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete load_stops" ON public.load_stops;
CREATE POLICY "org members delete load_stops" ON public.load_stops FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_load_stops_updated_at ON public.load_stops;
CREATE TRIGGER update_load_stops_updated_at BEFORE UPDATE ON public.load_stops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.load_documents (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid NOT NULL DEFAULT public.current_org_id()
                  REFERENCES public.organizations(id) ON DELETE CASCADE,
  load_id       uuid NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  kind          text NOT NULL DEFAULT 'other'
                  CHECK (kind IN ('rate_con','bol','pod','other')),
  document_url  text NOT NULL,
  file_name     text,
  notes         text,

  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_load_documents_org ON public.load_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_load_documents_load ON public.load_documents(load_id);

ALTER TABLE public.load_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read load_documents" ON public.load_documents;
CREATE POLICY "org members read load_documents" ON public.load_documents FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert load_documents" ON public.load_documents;
CREATE POLICY "org members insert load_documents" ON public.load_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members update load_documents" ON public.load_documents;
CREATE POLICY "org members update load_documents" ON public.load_documents FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete load_documents" ON public.load_documents;
CREATE POLICY "org members delete load_documents" ON public.load_documents FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

COMMENT ON TABLE public.loads IS
  'Carga/frete. Ciclo operacional termina em delivered — cobrança fica em invoices via invoice_id.';
COMMENT ON TABLE public.load_stops IS
  'Paradas de rota multi-parada. Opcional: trajeto simples usa as colunas origin_*/destination_* da carga.';
COMMENT ON COLUMN public.loads.metadata IS
  'Extensão por país sem migration: CT-e/CIOT no Brasil, rate confirmation nos EUA.';