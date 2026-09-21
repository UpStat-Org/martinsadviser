-- Client-uploaded files are limited to common document/image formats. The
-- browser also normalizes MIME types, while this policy protects direct API
-- calls that bypass the UI.
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
