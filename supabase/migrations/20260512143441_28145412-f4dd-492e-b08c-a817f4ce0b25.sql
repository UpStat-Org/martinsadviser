-- Hardening do fluxo de mensagens automáticas
ALTER TABLE public.scheduled_messages
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_queue
  ON public.scheduled_messages (status, scheduled_at)
  WHERE status IN ('pending', 'sending');

CREATE INDEX IF NOT EXISTS idx_automation_log_rule_permit
  ON public.automation_log (rule_id, permit_id);

CREATE INDEX IF NOT EXISTS idx_permits_user_status_expiration
  ON public.permits (user_id, status, expiration_date);

CREATE OR REPLACE FUNCTION public.claim_pending_messages(
  p_limit integer DEFAULT 50,
  p_channel text DEFAULT NULL
)
RETURNS SETOF public.scheduled_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.scheduled_messages
    WHERE status = 'pending'
      AND scheduled_at <= now()
      AND (next_retry_at IS NULL OR next_retry_at <= now())
      AND (p_channel IS NULL OR channel = p_channel)
    ORDER BY scheduled_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.scheduled_messages m
  SET status = 'sending',
      locked_at = now()
  FROM candidates c
  WHERE m.id = c.id
  RETURNING m.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_messages(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pending_messages(integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public.recover_stuck_sending()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.scheduled_messages
  SET status = 'pending',
      locked_at = NULL,
      last_error = COALESCE(last_error, '') || E'\n[recover] stuck in sending'
  WHERE status = 'sending'
    AND locked_at < now() - interval '10 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.recover_stuck_sending() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recover_stuck_sending() TO service_role;

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_functions_url')
     AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN

    PERFORM cron.unschedule('check-permit-expirations-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-permit-expirations-daily');

    PERFORM cron.schedule(
      'check-permit-expirations-daily',
      '0 9 * * *',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_functions_url') || '/check-permit-expirations',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
          ),
          body := '{}'::jsonb
        );
      $job$
    );

    PERFORM cron.unschedule('send-emails-every-5min')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-emails-every-5min');

    PERFORM cron.schedule(
      'send-emails-every-5min',
      '*/5 * * * *',
      $job$
        select public.recover_stuck_sending();
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_functions_url') || '/send-emails',
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
$outer$;