-- ---------------------------------------------------------------------------
-- Automatic Netlify subdomain provisioning for new tenants.
--
-- Netlify routes by Host header, so <slug>.dotpilot.online returns 404 until
-- the hostname is registered as a domain alias on the site. A wildcard alias
-- (*.dotpilot.online) would cover every tenant at once, but Netlify only
-- enables wildcard routing for paid teams — so each org needs its own alias.
--
-- Registering it by hand does not scale and is easy to forget: the org is
-- created, the user is redirected straight to their subdomain by StartOrg, and
-- lands on a 404. This wires the registration to the database instead.
--
--   1) sync_netlify_domains_async() — fires the reconciler edge function via
--      pg_net. AFTER INSERT on organizations (new tenant) and AFTER UPDATE OF
--      slug (renamed tenant, whose old alias gets pruned by the reconciler).
--   2) A 15-minute cron as a safety net, so a transient Netlify outage or a
--      missing Vault secret self-heals instead of leaving a dead subdomain.
--
-- The edge function is a reconciler: it recomputes the full alias set from
-- this database rather than taking the new slug as input, which is what makes
-- firing it from several places safe.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1) Trigger function
--
-- SECURITY DEFINER because vault.decrypted_secrets is not readable by the
-- roles that insert into organizations (authenticated, via the signup
-- trigger). Everything is schema-qualified and search_path is pinned, so the
-- elevated context cannot be hijacked by a caller-controlled search_path.
--
-- CRITICAL: the whole body is wrapped in an exception handler. This trigger
-- runs inside the transaction that creates the org — which, on the self-serve
-- path, is the auth.users INSERT itself (handle_new_user). An error here would
-- abort signup entirely. A subdomain that shows up 15 minutes late via cron is
-- a nuisance; a signup that fails outright is an outage.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_netlify_domains_async()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_functions_url')
     AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN

    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_functions_url')
             || '/sync-netlify-domains',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
  END IF;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Never block org creation. The cron below will pick the org up.
  RAISE WARNING 'sync_netlify_domains_async failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_netlify_domains_async() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 2) Triggers on organizations
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS organizations_sync_netlify_insert ON public.organizations;
CREATE TRIGGER organizations_sync_netlify_insert
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_netlify_domains_async();

DROP TRIGGER IF EXISTS organizations_sync_netlify_slug_update ON public.organizations;
CREATE TRIGGER organizations_sync_netlify_slug_update
  AFTER UPDATE OF slug ON public.organizations
  FOR EACH ROW
  WHEN (OLD.slug IS DISTINCT FROM NEW.slug)
  EXECUTE FUNCTION public.sync_netlify_domains_async();

-- ---------------------------------------------------------------------------
-- 3) Cron safety net — every 15 minutes.
--    Same Vault-secret guard as the other Edge-Function crons, so the job is
--    simply not registered in environments without the secrets.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_functions_url')
     AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN

    PERFORM cron.unschedule('sync-netlify-domains-15min')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-netlify-domains-15min');

    PERFORM cron.schedule(
      'sync-netlify-domains-15min',
      '*/15 * * * *',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_functions_url') || '/sync-netlify-domains',
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
