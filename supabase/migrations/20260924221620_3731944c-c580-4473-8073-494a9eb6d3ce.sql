REVOKE ALL ON FUNCTION public.update_org_hourly_rate(uuid, numeric) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_org_hourly_rate(uuid, numeric) TO authenticated;

REVOKE ALL ON FUNCTION public.prune_ai_briefings() FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.prune_ai_briefings() TO service_role;

REVOKE ALL ON FUNCTION public.sync_netlify_domains_async() FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.sync_netlify_domains_async() TO service_role;