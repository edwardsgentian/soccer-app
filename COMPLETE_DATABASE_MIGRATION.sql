-- Complete Database Migration for Soccer App
-- Run this entire script in your Supabase SQL Editor

-- ==============================================
-- 1. ADD ORGANIZER/LEADER FIELDS
-- ==============================================

-- Add created_by field to groups table
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES players(id) ON DELETE SET NULL;

-- Add created_by field to games table  
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES players(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by);

-- ==============================================
-- 2. ADD GAME DURATION FIELD
-- ==============================================

-- Add duration_hours field to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS duration_hours DECIMAL(3,1) DEFAULT 2.0;

-- Update existing games to have a default duration of 2 hours
UPDATE games 
SET duration_hours = 2.0 
WHERE duration_hours IS NULL;

-- ==============================================
-- 3. VERIFY CHANGES
-- ==============================================

-- Check that the new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name IN ('groups', 'games') 
AND column_name IN ('created_by', 'duration_hours')
ORDER BY table_name, column_name;

-- Check that indexes were created
SELECT indexname, tablename, indexdef
FROM pg_indexes 
WHERE tablename IN ('groups', 'games')
AND indexname LIKE '%created_by%';

-- ==============================================
-- 4. OPTIONAL: SET DEFAULT ORGANIZERS
-- ==============================================

-- Uncomment and modify these lines if you want to assign existing groups/games to a specific user
-- Replace 'YOUR_PLAYER_ID_HERE' with an actual player ID from your players table

-- UPDATE groups SET created_by = 'YOUR_PLAYER_ID_HERE' WHERE created_by IS NULL;
-- UPDATE games SET created_by = 'YOUR_PLAYER_ID_HERE' WHERE created_by IS NULL;

-- ==============================================
-- 5. TEST QUERIES
-- ==============================================

-- Test query to verify organizer relationships work
SELECT 
  g.name as group_name,
  p.name as organizer_name,
  g.created_at
FROM groups g
LEFT JOIN players p ON g.created_by = p.id
LIMIT 5;

-- Test query to verify game duration
SELECT 
  name,
  duration_hours,
  game_date
FROM games
WHERE duration_hours IS NOT NULL
LIMIT 5;

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================

-- If you see results from the test queries above, the migration was successful!
-- Your app should now work with organizer/leader functionality and hours played stats.
