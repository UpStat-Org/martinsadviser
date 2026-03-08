
-- Table to link auth users to clients for portal access
CREATE TABLE public.client_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id)
);

ALTER TABLE public.client_portal_users ENABLE ROW LEVEL SECURITY;

-- Portal users can read their own link
CREATE POLICY "Portal users can view own links"
  ON public.client_portal_users FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage portal users (insert/delete)
CREATE POLICY "Admins can manage portal users"
  ON public.client_portal_users FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow portal users to view clients they're linked to
CREATE POLICY "Portal users can view their client"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_users
      WHERE client_portal_users.client_id = clients.id
      AND client_portal_users.user_id = auth.uid()
    )
  );

-- Allow portal users to view trucks of their client
CREATE POLICY "Portal users can view their trucks"
  ON public.trucks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_users
      WHERE client_portal_users.client_id = trucks.client_id
      AND client_portal_users.user_id = auth.uid()
    )
  );

-- Allow portal users to view permits of their client
CREATE POLICY "Portal users can view their permits"
  ON public.permits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_users
      WHERE client_portal_users.client_id = permits.client_id
      AND client_portal_users.user_id = auth.uid()
    )
  );

-- Function to check if user is a portal user
CREATE OR REPLACE FUNCTION public.is_portal_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_portal_users
    WHERE user_id = _user_id
  )
$$;

-- Function to get the client_id for a portal user
CREATE OR REPLACE FUNCTION public.get_portal_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.client_portal_users
  WHERE user_id = _user_id
  LIMIT 1
$$;
