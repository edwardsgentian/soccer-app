-- Migration: Add photo_url column to groups table
-- Created: 2025-01-08
-- Description: Add a single photo_url field for the main group photo

-- Add photo_url column to groups table
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

-- Add comment to document the column
COMMENT ON COLUMN groups.photo_url IS 'URL of the main group photo (stored in Supabase Storage)';



