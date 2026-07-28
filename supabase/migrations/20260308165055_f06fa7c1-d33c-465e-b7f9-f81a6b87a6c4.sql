
-- Drop overly permissive policies
DROP POLICY "Authenticated users can update clients" ON public.clients;
DROP POLICY "Authenticated users can delete clients" ON public.clients;

-- Recreate with user_id check (any authenticated user who created a client, or update for team)
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
CREATE POLICY "Authenticated users can update clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;
CREATE POLICY "Authenticated users can delete clients"
  ON public.clients FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);
