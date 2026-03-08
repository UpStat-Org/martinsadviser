
-- Create trucks table
CREATE TABLE public.trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  plate text NOT NULL,
  vin text,
  year integer,
  make text,
  model text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create permits table
CREATE TABLE public.permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  permit_type text NOT NULL,
  permit_number text,
  state text,
  expiration_date date,
  status text NOT NULL DEFAULT 'active',
  document_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;

-- Trucks RLS policies
CREATE POLICY "Authenticated users can view all trucks" ON public.trucks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create trucks" ON public.trucks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update trucks" ON public.trucks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete trucks" ON public.trucks FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Permits RLS policies
CREATE POLICY "Authenticated users can view all permits" ON public.permits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create permits" ON public.permits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update permits" ON public.permits FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete permits" ON public.permits FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Updated_at triggers
CREATE TRIGGER update_trucks_updated_at BEFORE UPDATE ON public.trucks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permits_updated_at BEFORE UPDATE ON public.permits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for permits (expiration alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.trucks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.permits;
