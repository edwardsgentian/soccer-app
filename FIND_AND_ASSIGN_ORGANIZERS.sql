-- Find Your Player ID and Assign Organizers
-- Run this after the main migration to assign organizers to existing data

-- Step 1: Find your player ID
SELECT 
  id,
  name,
  email,
  created_at
FROM players
ORDER BY created_at DESC;

-- Step 2: Replace 'YOUR_PLAYER_ID_HERE' below with the ID from Step 1
-- Then uncomment and run these lines:

-- UPDATE groups SET created_by = 'YOUR_PLAYER_ID_HERE' WHERE created_by IS NULL;
-- UPDATE games SET created_by = 'YOUR_PLAYER_ID_HERE' WHERE created_by IS NULL;

-- Step 3: Verify the changes
SELECT 
  'groups' as table_name,
  COUNT(*) as total,
  COUNT(created_by) as with_organizer
FROM groups
UNION ALL
SELECT 
  'games' as table_name,
  COUNT(*) as total,
  COUNT(created_by) as with_organizer
FROM games;
