-- Fix RLS policy for game_attendees table
-- Disable RLS temporarily to allow inserts
ALTER TABLE game_attendees DISABLE ROW LEVEL SECURITY;

-- Or create a more permissive policy if you want to keep RLS enabled
-- DROP POLICY IF EXISTS "Users can insert game attendees" ON game_attendees;
-- CREATE POLICY "Users can insert game attendees" ON game_attendees
--     FOR INSERT WITH CHECK (true);

-- DROP POLICY IF EXISTS "Users can update game attendees" ON game_attendees;
-- CREATE POLICY "Users can update game attendees" ON game_attendees
--     FOR UPDATE USING (true) WITH CHECK (true);

-- DROP POLICY IF EXISTS "Users can select game attendees" ON game_attendees;
-- CREATE POLICY "Users can select game attendees" ON game_attendees
--     FOR SELECT USING (true);

