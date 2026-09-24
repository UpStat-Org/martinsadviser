REVOKE ALL ON FUNCTION public.is_portal_client(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_portal_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_portal_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_portal_order(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.notify_portal_service_order_question() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_service_order_question_scope() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.portal_list_services() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_list_service_orders() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_get_service_order(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_list_quotes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_list_invoices() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_create_service_order(text, text, uuid, uuid, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_answer_service_order_question(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_attach_checklist_document(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_sign_service_order_document(uuid, uuid, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_respond_quote(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_can_read_service_order_document(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.portal_list_services() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_service_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_service_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_quotes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_invoices() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_create_service_order(text, text, uuid, uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_answer_service_order_question(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_attach_checklist_document(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_sign_service_order_document(uuid, uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_respond_quote(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_can_read_service_order_document(text) TO authenticated;