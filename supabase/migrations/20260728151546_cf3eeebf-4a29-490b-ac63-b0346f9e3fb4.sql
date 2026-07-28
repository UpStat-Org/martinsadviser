DROP POLICY IF EXISTS "Authenticated users can read permit documents"   ON public.permit_documents;
DROP POLICY IF EXISTS "Authenticated users can insert permit documents" ON public.permit_documents;
DROP POLICY IF EXISTS "Authenticated users can update permit documents" ON public.permit_documents;
DROP POLICY IF EXISTS "Authenticated users can delete permit documents" ON public.permit_documents;

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

UPDATE public.organizations
   SET feature_flags = feature_flags || jsonb_build_object('crm', true)
 WHERE NOT (feature_flags ? 'crm');

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