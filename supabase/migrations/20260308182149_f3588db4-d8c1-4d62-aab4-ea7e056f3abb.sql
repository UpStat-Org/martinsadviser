
-- Create storage bucket for permit documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('permit-documents', 'permit-documents', true);

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "Authenticated users can upload permit documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload permit documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'permit-documents');

-- Allow authenticated users to view files
DROP POLICY IF EXISTS "Anyone can view permit documents" ON storage.objects;
CREATE POLICY "Anyone can view permit documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'permit-documents');

-- Allow authenticated users to delete their files
DROP POLICY IF EXISTS "Authenticated users can delete permit documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete permit documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'permit-documents');

-- Allow authenticated users to update files
DROP POLICY IF EXISTS "Authenticated users can update permit documents" ON storage.objects;
CREATE POLICY "Authenticated users can update permit documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'permit-documents');
