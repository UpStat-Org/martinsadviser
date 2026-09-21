-- The existing RBAC guard is RESTRICTIVE, so it must explicitly admit the
-- narrowly-scoped portal hierarchy as well as organization writers. The
-- separate permissive portal policy still enforces the file allowlist.
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
