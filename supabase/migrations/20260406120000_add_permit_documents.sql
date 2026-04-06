-- Permit document versioning table
CREATE TABLE IF NOT EXISTS permit_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID REFERENCES permits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  document_url TEXT NOT NULL,
  file_name TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_permit_documents_permit_id ON permit_documents(permit_id);
CREATE INDEX idx_permit_documents_is_current ON permit_documents(permit_id, is_current);

-- RLS
ALTER TABLE permit_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read permit documents"
  ON permit_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert permit documents"
  ON permit_documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update permit documents"
  ON permit_documents FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete permit documents"
  ON permit_documents FOR DELETE TO authenticated USING (true);
