-- Bind portal uploads to the authenticated client's organization, order and
-- checklist item before the object is accepted by Storage.
CREATE OR REPLACE FUNCTION public.portal_can_upload_service_order_document(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_portal_users cpu
    JOIN public.service_orders so
      ON so.client_id = cpu.client_id
     AND so.org_id = cpu.org_id
    JOIN public.service_order_checklist_items ci
      ON ci.service_order_id = so.id
    WHERE cpu.user_id = auth.uid()
      AND split_part(p_path, '/', 1) = so.org_id::text
      AND split_part(p_path, '/', 2) = 'service-orders'
      AND split_part(p_path, '/', 3) = so.id::text
      AND split_part(p_path, '/', 4) = ci.id::text
      AND split_part(p_path, '/', 5) <> ''
      AND split_part(p_path, '/', 6) = ''
  );
$$;

REVOKE ALL ON FUNCTION public.portal_can_upload_service_order_document(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_can_upload_service_order_document(text) TO authenticated;

DROP POLICY IF EXISTS "portal users upload service order documents" ON storage.objects;
CREATE POLICY "portal users upload service order documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'permit-documents'
    AND public.portal_can_upload_service_order_document(name)
  );

COMMENT ON FUNCTION public.portal_can_upload_service_order_document(text) IS
  'Allows portal uploads only inside the caller client organization/order/checklist hierarchy.';
