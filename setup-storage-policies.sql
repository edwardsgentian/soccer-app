-- Setup storage policies for the photos bucket
-- Run this in your Supabase SQL editor

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access to photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete photos" ON storage.objects;

-- Policy 1: Allow public read access to photos
CREATE POLICY "Public read access to photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

-- Policy 2: Allow anyone (authenticated and anonymous) to upload photos
CREATE POLICY "Anyone can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos');

-- Policy 3: Allow anyone to update photos
CREATE POLICY "Anyone can update photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'photos');

-- Policy 4: Allow anyone to delete photos
CREATE POLICY "Anyone can delete photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'photos');

