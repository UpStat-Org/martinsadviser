-- ============================================================================
-- Audit fixes — 2026-07-28
--
-- Three unrelated defects found while auditing the schema, grouped here
-- because each one is a handful of statements:
--
--   1. permit_documents still carries four fully-permissive RLS policies from
--      the pre-multi-tenancy days. Policies are OR-ed, so they cancel out the
--      org-scoped ones added in 20260519181000 — any authenticated user could
--      read, insert, update or delete document rows of ANY org.
--   2. The `crm` feature flag exists only as a frontend default; the column
--      DEFAULT still lists the original 8 flags.
--   3. generate-notifications has never had a cron job, despite the comment in
--      20260519184000 describing it as cron-triggered.
--
-- All statements are idempotent — safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Close the permit_documents cross-tenant hole.
--
-- Created by 20260406120000_add_permit_documents.sql as `USING (true)`. The
-- multi-tenancy migration dropped only the policies named "Users can …" and
-- never these, so they survived and neutralised the org-scoped replacements.
--
-- Dropping them leaves the four "org members …" policies from
-- 20260519181000_trucks_permits_multitenancy.sql as the only ones on the
-- table, which is the intended state.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can read permit documents"   ON public.permit_documents;
DROP POLICY IF EXISTS "Authenticated users can insert permit documents" ON public.permit_documents;
DROP POLICY IF EXISTS "Authenticated users can update permit documents" ON public.permit_documents;
DROP POLICY IF EXISTS "Authenticated users can delete permit documents" ON public.permit_documents;

-- Recreate the org-scoped policies if they're missing, so a database that only
-- ever ran the permissive migration doesn't end up with RLS on and no policy
-- at all (which would deny everything).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'permit_documents'
       AND policyname = 'org members read permit documents'
  ) THEN
    CREATE POLICY "org members read permit documents"
      ON public.permit_documents FOR SELECT TO authenticated
      USING (public.is_org_member(org_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'permit_documents'
       AND policyname = 'org members insert permit documents'
  ) THEN
    CREATE POLICY "org members insert permit documents"
      ON public.permit_documents FOR INSERT TO authenticated
      WITH CHECK (public.is_org_member(org_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'permit_documents'
       AND policyname = 'org members update permit documents'
  ) THEN
    CREATE POLICY "org members update permit documents"
      ON public.permit_documents FOR UPDATE TO authenticated
      USING (public.is_org_member(org_id))
      WITH CHECK (public.is_org_member(org_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'permit_documents'
       AND policyname = 'org members delete permit documents'
  ) THEN
    CREATE POLICY "org members delete permit documents"
      ON public.permit_documents FOR DELETE TO authenticated
      USING (public.is_org_member(org_id));
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2) Add `crm` to the canonical feature-flag shape.
--
-- src/contexts/OrgContext.tsx has shipped 9 flags since 20260708120000 while
-- the column DEFAULT still had 8. It worked by accident — a missing key falls
-- back to FLAG_DEFAULTS.crm = true — but the flag was invisible to any
-- server-side reader and the admin toggle had nothing to write over.
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations
  ALTER COLUMN feature_flags SET DEFAULT jsonb_build_object(
    'messages',    true,
    'calendar',    true,
    'ai_chat',     true,
    'ai_reports',  true,
    'finance',     true,
    'portal',      true,
    'automations', true,
    'audit_log',   true,
    'crm',         true
  );

-- Backfill only the missing key; an org that deliberately turned another flag
-- off keeps that choice.
UPDATE public.organizations
   SET feature_flags = feature_flags || jsonb_build_object('crm', true)
 WHERE NOT (feature_flags ? 'crm');

-- ---------------------------------------------------------------------------
-- 3) Schedule generate-notifications.
--
-- Same Vault guard as every other cron in this project: if the secrets aren't
-- provisioned the block is a no-op. 08:45 UTC puts it ahead of
-- generate-compliance-tasks (09:15) and generate-dunning (09:30) so the
-- notification feed is populated before the task/dunning batches run.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_functions_url')
     AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN

    PERFORM cron.unschedule('generate-notifications-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-notifications-daily');

    PERFORM cron.schedule(
      'generate-notifications-daily',
      '45 8 * * *',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_functions_url') || '/generate-notifications',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
          ),
          body := '{}'::jsonb
        );
      $job$
    );
  END IF;
END
$$;
