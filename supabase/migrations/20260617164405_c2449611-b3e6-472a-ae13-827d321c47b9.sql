-- Hide encrypted credentials from client roles (service_role still reads them).
REVOKE SELECT (api_key) ON public.eld_connections FROM authenticated;
REVOKE SELECT (api_key) ON public.eld_connections FROM anon;

REVOKE SELECT (initial_password_encrypted) ON public.client_portal_users FROM authenticated;
REVOKE SELECT (initial_password_encrypted) ON public.client_portal_users FROM anon;

-- Allow org members to delete IFTA filings (mirror of update policy).
DROP POLICY IF EXISTS "org members delete ifta_filings" ON public.ifta_filings;
CREATE POLICY "org members delete ifta_filings"
  ON public.ifta_filings FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));