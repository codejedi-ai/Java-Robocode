-- Create banners bucket for banner images
-- This is separate from profile-pics bucket for better organization

-- Drop old banner policies from profile-pics bucket (if they exist)
DROP POLICY IF EXISTS "Users can upload their own banner" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own banner" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own banner" ON storage.objects;

-- Create the banners storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for banners bucket
-- Anyone can view banners
CREATE POLICY IF NOT EXISTS "Anyone can view banners" ON storage.objects
  FOR SELECT USING (bucket_id = 'banners');

-- Users can upload their own banner
CREATE POLICY IF NOT EXISTS "Users can upload their own banner" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'banners' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own banner
CREATE POLICY IF NOT EXISTS "Users can update their own banner" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'banners' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own banner
CREATE POLICY IF NOT EXISTS "Users can delete their own banner" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'banners' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

