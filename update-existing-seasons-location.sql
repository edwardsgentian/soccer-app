-- Update existing seasons with a default location
UPDATE seasons 
SET location = 'TBD' 
WHERE location IS NULL OR location = '';

-- Check the results
SELECT id, name, location FROM seasons;
