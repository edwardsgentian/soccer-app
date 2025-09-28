-- Fix RLS policies for attendance tables to work with custom authentication
-- Since we're handling authentication in our API layer, we can allow all operations

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Players can update their own season game attendance" ON season_game_attendance;
DROP POLICY IF EXISTS "Players can insert their own season game attendance" ON season_game_attendance;
DROP POLICY IF EXISTS "Players can update their own game attendance status" ON game_attendees;
DROP POLICY IF EXISTS "Players can update their own season attendance status" ON season_attendees;

-- Create permissive policies that allow all operations
-- (Authentication is handled in the API layer)
CREATE POLICY "Allow all operations on season game attendance" ON season_game_attendance FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on game attendees attendance" ON game_attendees FOR UPDATE USING (true);

CREATE POLICY "Allow all operations on season attendees attendance" ON season_attendees FOR UPDATE USING (true);
