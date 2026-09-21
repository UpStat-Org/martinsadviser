-- Supabase grants function execution to `anon` through default privileges,
-- independently of PostgreSQL's PUBLIC role. Portal RPCs require a verified
-- user, so revoke both paths explicitly.
REVOKE EXECUTE ON FUNCTION public.is_portal_client(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_portal_order(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_list_services() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_list_service_orders() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_get_service_order(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_list_quotes() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_list_invoices() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_create_service_order(text, text, uuid, uuid, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_answer_service_order_question(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_attach_checklist_document(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_sign_service_order_document(uuid, uuid, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_respond_quote(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_can_read_service_order_document(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_can_upload_service_order_document(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_portal_service_order_question() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_service_order_question_scope() FROM PUBLIC, anon, authenticated;
