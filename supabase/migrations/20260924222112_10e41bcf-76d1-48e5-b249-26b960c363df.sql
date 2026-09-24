REVOKE ALL ON FUNCTION public.log_service_order_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_service_order_child_event() FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.log_service_order_event() TO service_role;
GRANT ALL ON FUNCTION public.log_service_order_child_event() TO service_role;