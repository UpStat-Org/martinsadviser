-- lovable-cron-fallback-reviewed: reconciles tenant domain aliases against an external hosting provider that cannot push changes back to us; the trigger only covers the happy path, so a missed call would leave a tenant's address dead until the next sweep. 96 runs/day, 15-minute maximum recovery delay.

-- 20260731140000_netlify_subdomain_provisioning.sql
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
  RAISE WARNING 'sync_netlify_domains_async failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_netlify_domains_async() FROM PUBLIC;

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