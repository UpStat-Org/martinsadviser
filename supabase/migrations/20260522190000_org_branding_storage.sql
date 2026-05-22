-- ============================================================================
-- Storage bucket "org-branding" — uploaded white-label logos
--
-- Lets org admins upload a logo image directly (instead of pasting a public
-- URL). The uploaded file's public URL is stored in organizations.branding
-- ->> 'logo_url', so everything that already reads that field (sidebar,
-- browser tab, the pre-auth Login page via get_org_by_slug) keeps working
-- unchanged.
--
-- Bucket is PUBLIC: the Login page renders a tenant's logo before the user
-- authenticates, so the file must be readable by anon via its public URL.
-- Writes (upload/update/delete) are locked to org admins, scoped by the
-- first path segment being the caller's org_id — same convention as
-- permit-documents (see 20260520120000_storage_multitenancy.sql).
--
-- Path convention enforced by the frontend: "${org_id}/logo-${ts}.${ext}".
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('org-branding', 'org-branding', true)
ON CONFLICT (id) DO NOTHING;

-- Public read: logos are non-sensitive brand assets shown pre-auth.
CREATE POLICY "Anyone can view org branding"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'org-branding');

-- Writes restricted to admins of the org named by the first path segment.
CREATE POLICY "Org admins can upload org branding"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'org-branding'
    AND public.is_org_admin( (storage.foldername(name))[1]::uuid )
  );

CREATE POLICY "Org admins can update org branding"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'org-branding'
    AND public.is_org_admin( (storage.foldername(name))[1]::uuid )
  )
  WITH CHECK (
    bucket_id = 'org-branding'
    AND public.is_org_admin( (storage.foldername(name))[1]::uuid )
  );

CREATE POLICY "Org admins can delete org branding"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'org-branding'
    AND public.is_org_admin( (storage.foldername(name))[1]::uuid )
  );
