-- ============================================================================
-- Fase 0 — base multi-país / multi-moeda no nível da organização
--
-- Até aqui o país só existia em `clients.country` (20260520200000), usado
-- apenas pra escolher o mapa do PermitCoverageMap. A organização em si não
-- tinha país nenhum, e isso produziu dois problemas concretos:
--
--   1. O seletor de país em /start é DECORATIVO. Tanto handle_new_user quanto
--      public_create_org_with_owner validam `country` ('US','BR','ES') e depois
--      inserem em organizations sem a coluna — o valor é descartado em silêncio.
--   2. Moeda é USD hard-coded em 19 lugares do frontend
--      (`Intl.NumberFormat("en-US", { currency: "USD" })`) e não existe nenhuma
--      coluna de moeda no banco. Uma org brasileira faturaria em dólar.
--
-- Esta migration dá à organização as três dimensões regionais que o produto
-- precisa pra atender BR e US no mesmo código:
--
--   country  — qual conjunto regulatório vale (FMCSA/DOT vs ANTT/DNIT).
--              Dirige quais módulos aparecem, não só o mapa.
--   currency — como o dinheiro é escrito e em que moeda a org fatura.
--   locale   — idioma padrão da org pra novos membros e pra documentos
--              gerados no servidor (email de cobrança, PDF de compliance),
--              onde não existe um usuário logado pra ler a preferência dele.
--
-- Moeda fica no nível da ORG, não da linha de invoice: uma assessoria atende
-- um país e fatura numa moeda só. Se um dia uma org precisar faturar em duas
-- moedas, o lugar certo é uma coluna `currency` em invoices/quotes/expenses
-- com DEFAULT vindo daqui — por isso os defaults abaixo já ficam prontos pra
-- servir de fonte.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Defaults derivados do país.
--
-- Funções em vez de CASE repetido: os três lugares que criam org (trigger de
-- signup, RPC self-serve, RPC de super-admin) precisam da mesma regra, e uma
-- divergência entre eles produziria orgs com moeda incoerente com o país.
-- IMMUTABLE porque o mapeamento é fixo — permite uso em índice/constraint no
-- futuro sem replanejar.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 2) Colunas na organização.
--
-- DEFAULT 'US'/'USD'/'en' faz as orgs existentes continuarem exatamente como
-- estão — nenhuma delas muda de comportamento ao aplicar isto. O CHECK de
-- country espelha o de clients.country (US/BR/ES) pra não haver um país válido
-- num nível e inválido no outro.
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

-- Constraints separadas do ADD COLUMN pra manter a migration reaplicável:
-- ADD CONSTRAINT não tem IF NOT EXISTS em Postgres < 16.
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

-- ---------------------------------------------------------------------------
-- 3) handle_new_user — passa a PERSISTIR o país escolhido no /start.
--
-- Idêntico a 20260528132603 exceto pelo INSERT em organizations, que agora
-- grava country + currency/locale derivados. Sem isso o formulário continua
-- coletando um dado que morre na validação.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 4) public_create_org_with_owner — mesmo conserto no caminho self-serve.
--
-- Esta RPC já recebia p_country e já o validava; só faltava gravá-lo.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 5) super_admin_create_org — ganha p_country pra o operador da plataforma
-- conseguir provisionar uma org brasileira direto do painel.
--
-- A versão de 2 argumentos é derrubada antes: mantê-la criaria duas funções
-- com o mesmo nome, e o PostgREST resolveria a chamada por nome de argumento
-- de forma ambígua. Com DEFAULT no terceiro parâmetro, o SuperAdmin.tsx atual
-- (que passa só slug + name) continua funcionando sem alteração.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 6) update_org_regional_settings — edição pelo admin da org.
--
-- Mesma forma de update_org_branding / update_org_hourly_rate: SECURITY
-- DEFINER com checagem is_org_admin() escrevendo APENAS estas três colunas.
-- A policy de UPDATE em organizations é owner-only e cobre a tabela inteira;
-- afrouxá-la entregaria feature_flags e subscription_status junto.
--
-- Trocar o país NÃO reescreve moeda/idioma automaticamente: uma org americana
-- que atende cliente brasileiro pode querer país US com idioma pt. Quem chama
-- decide — a UI sugere o default e deixa o admin sobrescrever.
-- ---------------------------------------------------------------------------

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
