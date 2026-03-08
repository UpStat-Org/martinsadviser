
-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  ein TEXT,
  dot TEXT,
  mc TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  service_ifta BOOLEAN NOT NULL DEFAULT false,
  service_ct BOOLEAN NOT NULL DEFAULT false,
  service_ny BOOLEAN NOT NULL DEFAULT false,
  service_kyu BOOLEAN NOT NULL DEFAULT false,
  service_nm BOOLEAN NOT NULL DEFAULT false,
  service_automatic BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can manage all clients (small team, shared access)
CREATE POLICY "Authenticated users can view all clients"
  ON public.clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create clients"
  ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update clients"
  ON public.clients FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete clients"
  ON public.clients FOR DELETE TO authenticated USING (true);

-- Timestamp trigger
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_clients_company_name ON public.clients(company_name);
CREATE INDEX idx_clients_dot ON public.clients(dot);
CREATE INDEX idx_clients_mc ON public.clients(mc);
CREATE INDEX idx_clients_status ON public.clients(status);
