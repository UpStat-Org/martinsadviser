-- ============================================================================
-- Multi-tenancy: storage bucket "permit-documents" isolation
--
-- Original setup (20260308182149_*.sql):
--   - bucket is public
--   - policies only check bucket_id = 'permit-documents' — any authenticated
--     user can list/read/upload/delete any object in the bucket regardless
--     of org membership.
--
-- This migration:
--   1) Backfills existing objects (no org prefix) into the MartinsAdviser org
--      prefix so they remain reachable for that tenant.
--   2) Rewrites the storage.objects policies to require the first path
--      segment to be a UUID the caller is an approved member of.
--   3) Keeps the bucket public for now — public URLs still work, but only
--      objects you can list/upload via API are org-scoped. Switching to
--      signed URLs is a follow-up (requires reissuing existing document_url
--      values, since they currently store getPublicUrl results).
--
-- After this migration the frontend MUST upload under "${org_id}/...".
-- PermitFormDialog.tsx has been patched accordingly in the same change.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Backfill: move legacy objects into the MartinsAdviser org prefix.
--    Existing names look like "<permitId>/<timestamp>.<ext>" — we want
--    "<martinsAdviserOrgId>/<permitId>/<timestamp>.<ext>".
--    Objects that already start with a UUID (any 36-char prefix matching the
--    UUID shape) are assumed to be already-namespaced and left alone.
-- ---------------------------------------------------------------------------

UPDATE storage.objects
   SET name = '00000000-0000-0000-0000-000000000001/' || name
 WHERE bucket_id = 'permit-documents'
   AND name !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/';

-- The permits.document_url column stores absolute public URLs that embed the
-- old path. Rewrite those URLs to point to the new path so existing rows
-- keep working. This is a pure string replacement on rows where the URL
-- still references a permit-documents object without an org prefix.
UPDATE public.permits
   SET document_url = regexp_replace(
         document_url,
         '(/permit-documents/)(?!([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/))',
         '\1' || '00000000-0000-0000-0000-000000000001/'
       )
 WHERE document_url IS NOT NULL
   AND document_url LIKE '%/permit-documents/%';

-- ---------------------------------------------------------------------------
-- 2) Replace the permissive policies with org-scoped ones.
--    storage.foldername(name) returns the path segments as a text[]; the
--    first element is the top-level "folder" which we use as org_id.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can upload permit documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view permit documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete permit documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update permit documents" ON storage.objects;

CREATE POLICY "Org members can view permit documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'permit-documents'
    AND public.is_org_member( (storage.foldername(name))[1]::uuid )
  );

CREATE POLICY "Org members can upload permit documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'permit-documents'
    AND public.is_org_member( (storage.foldername(name))[1]::uuid )
  );

CREATE POLICY "Org members can update permit documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'permit-documents'
    AND public.is_org_member( (storage.foldername(name))[1]::uuid )
  )
  WITH CHECK (
    bucket_id = 'permit-documents'
    AND public.is_org_member( (storage.foldername(name))[1]::uuid )
  );

CREATE POLICY "Org members can delete permit documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'permit-documents'
    AND public.is_org_member( (storage.foldername(name))[1]::uuid )
  );
