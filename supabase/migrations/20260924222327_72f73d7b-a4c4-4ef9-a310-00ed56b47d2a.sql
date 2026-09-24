-- 20260916200000_restrict_portal_upload_types.sql
DROP POLICY IF EXISTS "portal users upload service order documents" ON storage.objects;
CREATE POLICY "portal users upload service order documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'permit-documents'
    AND public.portal_can_upload_service_order_document(name)
    AND lower(storage.extension(name)) IN (
      'pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'
    )
    AND lower(COALESCE(metadata ->> 'mimetype', '')) IN (
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain'
    )
  );

-- 20260916210000_allow_scoped_portal_uploads.sql
DROP POLICY IF EXISTS "org writers only upload permit documents" ON storage.objects;
CREATE POLICY "org writers only upload permit documents"
  ON storage.objects
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id <> 'permit-documents'
    OR public.can_org_write(((storage.foldername(name))[1])::uuid)
    OR public.portal_can_upload_service_order_document(name)
  );

-- 20260916220000_revoke_anonymous_portal_rpcs.sql
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