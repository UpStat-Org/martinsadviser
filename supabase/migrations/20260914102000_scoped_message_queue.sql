-- Manual sends must never claim another organization's queue. The global
-- claim function remains service-role-only for the five-minute cron worker;
-- this sibling is used by the authenticated, organization-scoped endpoint.
CREATE OR REPLACE FUNCTION public.claim_pending_messages_for_org(
  p_org_id uuid,
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
    SELECT m.id
      FROM public.scheduled_messages m
     WHERE m.org_id = p_org_id
       AND m.status = 'pending'
       AND m.scheduled_at <= now()
       AND (m.next_retry_at IS NULL OR m.next_retry_at <= now())
       AND (p_channel IS NULL OR m.channel = p_channel)
     ORDER BY m.scheduled_at
     LIMIT greatest(1, least(coalesce(p_limit, 50), 100))
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.scheduled_messages m
     SET status = 'sending', locked_at = now()
    FROM candidates c
   WHERE m.id = c.id
  RETURNING m.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_messages_for_org(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pending_messages_for_org(uuid, integer, text) TO service_role;
