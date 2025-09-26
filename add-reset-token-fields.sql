-- Add reset token fields to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;

-- Create index for reset token lookups
CREATE INDEX IF NOT EXISTS idx_players_reset_token ON players(reset_token);

