-- Fix database schema issues

-- 1. Add password field if it doesn't exist (for backward compatibility)
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- 2. Add reset token fields if they don't exist
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;

-- 3. Create index for reset token lookups
CREATE INDEX IF NOT EXISTS idx_players_reset_token ON players(reset_token);

-- 4. Update RLS policies to allow inserts (if needed)
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Players can insert their own data" ON players;
DROP POLICY IF EXISTS "Players can update their own data" ON players;

-- Create more permissive policies for testing
CREATE POLICY "Anyone can insert players" ON players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update players" ON players
  FOR UPDATE USING (true);

-- 5. Ensure the players table has all required fields
-- This will add any missing columns without error if they already exist
DO $$ 
BEGIN
    -- Add any missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'password') THEN
        ALTER TABLE players ADD COLUMN password VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'reset_token') THEN
        ALTER TABLE players ADD COLUMN reset_token VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'reset_token_expires') THEN
        ALTER TABLE players ADD COLUMN reset_token_expires TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

