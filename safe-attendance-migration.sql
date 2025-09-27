-- Safe migration for attendance status - handles existing policies
-- This version uses DROP IF EXISTS to avoid conflicts

-- Add attendance_status column to game_attendees
ALTER TABLE game_attendees 
ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(20) DEFAULT 'attending' 
CHECK (attendance_status IN ('attending', 'not_attending'));

-- Add attendance_status column to season_attendees
ALTER TABLE season_attendees 
ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(20) DEFAULT 'attending' 
CHECK (attendance_status IN ('attending', 'not_attending'));

-- Create season_game_attendance table if it doesn't exist
CREATE TABLE IF NOT EXISTS season_game_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_attendee_id UUID NOT NULL REFERENCES season_attendees(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  attendance_status VARCHAR(20) DEFAULT 'not_attending' CHECK (attendance_status IN ('attending', 'not_attending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(season_attendee_id, game_id)
);

-- Enable RLS
ALTER TABLE season_game_attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Anyone can view season game attendance" ON season_game_attendance;
DROP POLICY IF EXISTS "Players can update their own season game attendance" ON season_game_attendance;
DROP POLICY IF EXISTS "Players can insert their own season game attendance" ON season_game_attendance;
DROP POLICY IF EXISTS "Players can update their own game attendance status" ON game_attendees;
DROP POLICY IF EXISTS "Players can update their own season attendance status" ON season_attendees;

-- Create RLS policies
CREATE POLICY "Anyone can view season game attendance" ON season_game_attendance FOR SELECT USING (true);

CREATE POLICY "Players can update their own season game attendance" ON season_game_attendance FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM season_attendees sa 
      WHERE sa.id = season_game_attendance.season_attendee_id 
      AND sa.player_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Players can insert their own season game attendance" ON season_game_attendance FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM season_attendees sa 
      WHERE sa.id = season_game_attendance.season_attendee_id 
      AND sa.player_id = auth.uid()::uuid
    )
  );

-- Add RLS policies for updating attendance status
CREATE POLICY "Players can update their own game attendance status" ON game_attendees FOR UPDATE 
  USING (player_id = auth.uid()::uuid);

CREATE POLICY "Players can update their own season attendance status" ON season_attendees FOR UPDATE 
  USING (player_id = auth.uid()::uuid);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_attendees_attendance_status ON game_attendees(attendance_status);
CREATE INDEX IF NOT EXISTS idx_season_attendees_attendance_status ON season_attendees(attendance_status);
CREATE INDEX IF NOT EXISTS idx_season_game_attendance_season_attendee ON season_game_attendance(season_attendee_id);
CREATE INDEX IF NOT EXISTS idx_season_game_attendance_game ON season_game_attendance(game_id);
CREATE INDEX IF NOT EXISTS idx_season_game_attendance_status ON season_game_attendance(attendance_status);
