-- Test if attendance_status column exists and RLS policies are working
-- Run this in Supabase SQL editor to check the database state

-- Check if attendance_status column exists in game_attendees
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'game_attendees' 
AND column_name = 'attendance_status';

-- Check if attendance_status column exists in season_attendees
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'season_attendees' 
AND column_name = 'attendance_status';

-- Check if season_game_attendance table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'season_game_attendance';

-- Check RLS policies on game_attendees
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'game_attendees';

-- Test a simple query to see if it works
SELECT id, player_id, game_id, payment_status, attendance_status 
FROM game_attendees 
LIMIT 1;
