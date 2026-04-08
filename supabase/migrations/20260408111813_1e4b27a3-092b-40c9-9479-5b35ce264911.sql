CREATE TABLE public.permit_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID REFERENCES public.permits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  document_url TEXT NOT NULL,
  file_name TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.permit_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view permit documents" ON public.permit_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert permit documents" ON public.permit_documents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update permit documents" ON public.permit_documents
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete permit documents" ON public.permit_documents
  FOR DELETE TO authenticated USING (true);