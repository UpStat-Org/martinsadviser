-- ============================================================================
-- Storage: private bucket + signed-URL workflow
--
-- Until now the permit-documents bucket was public. Org-scoped policies (W4)
-- block listing/upload/delete cross-tenant, but a leaked public URL was
-- still downloadable by anyone who knew it. This migration closes that gap:
--
--   1) Bucket flipped to private (public = false). getPublicUrl() will stop
--      working; callers must mint short-lived signed URLs via
--      storage.from(...).createSignedUrl(path, ttl).
--
--   2) `permits.document_url` and `permit_documents.document_url` are
--      rewritten from "https://.../storage/v1/object/public/permit-documents/<path>"
--      to just "<path>". This is what the frontend now stores going forward
--      (PermitFormDialog patch ships alongside). Already-path rows are left
--      alone (LIKE 'http%' guards the UPDATE).
--
--   3) New storage policy gives portal users READ on their linked client's
--      documents. Without it the existing org-member policy would lock them
--      out — they're not in organization_members, only in client_portal_users.
--      The policy is path-aware: the first segment must be the org_id of
--      the client the portal user is linked to, and they can only read
--      (no upload/update/delete from the portal).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Strip the public URL prefix from existing rows. Idempotent — only
-- touches values that still look like a full URL.
-- ---------------------------------------------------------------------------

UPDATE public.permits
   SET document_url = regexp_replace(document_url, '^.*/permit-documents/', '')
 WHERE document_url IS NOT NULL
   AND document_url LIKE 'http%';

UPDATE public.permit_documents
   SET document_url = regexp_replace(document_url, '^.*/permit-documents/', '')
 WHERE document_url IS NOT NULL
   AND document_url LIKE 'http%';

-- ---------------------------------------------------------------------------
-- 2) Flip the bucket to private. After this, getPublicUrl() returns a 400.
-- ---------------------------------------------------------------------------

UPDATE storage.buckets
   SET public = false
 WHERE id = 'permit-documents';

-- ---------------------------------------------------------------------------
-- 3) Portal-user read access to their linked client's documents.
--
-- Path convention: <org_id>/<permit_id>/<ts>.<ext>
--   storage.foldername(name)[1] = org_id
--   storage.foldername(name)[2] = permit_id
--
-- A portal user can read a document iff they're linked to a client whose
-- permits include that permit_id, AND the org segment matches the client's
-- org. The latter is redundant (the permit_id already pins the org), but
-- keeping it makes the policy safer if a path is malformed.
-- ---------------------------------------------------------------------------

CREATE POLICY "Portal users can view their client documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'permit-documents'
    AND EXISTS (
      SELECT 1
        FROM public.permits p
        JOIN public.client_portal_users cpu
          ON cpu.client_id = p.client_id
       WHERE cpu.user_id = auth.uid()
         AND p.id::text = (storage.foldername(name))[2]
         AND p.org_id::text = (storage.foldername(name))[1]
    )
  );
