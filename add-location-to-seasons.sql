-- Add location field to seasons table
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Update existing seasons with a default location if needed
-- UPDATE seasons SET location = 'TBD' WHERE location IS NULL;
