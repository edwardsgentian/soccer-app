-- Quick database fix for immediate testing

-- 1. Disable RLS temporarily for testing
ALTER TABLE players DISABLE ROW LEVEL SECURITY;

-- 2. Add missing columns if they don't exist
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS password VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;

-- 3. Create index for reset token
CREATE INDEX IF NOT EXISTS idx_players_reset_token ON players(reset_token);

-- 4. Test insert to make sure it works
-- (This will be commented out, uncomment to test)
-- INSERT INTO players (name, email, phone, password_hash, member_since) 
-- VALUES ('Test User', 'test@example.com', '+1234567890', 'dGVzdHBhc3N3b3Jk', NOW())
-- ON CONFLICT (email) DO NOTHING;

