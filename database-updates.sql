-- Database schema updates for Season and Game management

-- 1. Create seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  season_price DECIMAL(10,2) NOT NULL,
  individual_game_price DECIMAL(10,2) NOT NULL,
  total_games INTEGER NOT NULL,
  season_spots INTEGER NOT NULL,
  game_spots INTEGER NOT NULL,
  first_game_date DATE NOT NULL,
  first_game_time TIME NOT NULL,
  repeat_type VARCHAR(20) NOT NULL CHECK (repeat_type IN ('weekly', 'bi-weekly', 'custom')),
  repeat_interval INTEGER DEFAULT 1, -- weeks between games
  allow_individual_sales BOOLEAN DEFAULT false,
  season_signup_deadline DATE, -- when season signup closes
  include_organizer_in_count BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES players(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create discount_codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES players(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 3. Add season fields to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS game_number INTEGER, -- position in the season (1, 2, 3, etc.)
ADD COLUMN IF NOT EXISTS is_individual_sale_allowed BOOLEAN DEFAULT false;

-- 4. Create season_attendees table for tracking season memberships
CREATE TABLE IF NOT EXISTS season_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  amount_paid DECIMAL(10,2),
  discount_code_id UUID REFERENCES discount_codes(id),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(season_id, player_id)
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seasons_group_id ON seasons(group_id);
CREATE INDEX IF NOT EXISTS idx_seasons_created_by ON seasons(created_by);
CREATE INDEX IF NOT EXISTS idx_games_season_id ON games(season_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_season_id ON discount_codes(season_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_game_id ON discount_codes(game_id);
CREATE INDEX IF NOT EXISTS idx_season_attendees_season_id ON season_attendees(season_id);
CREATE INDEX IF NOT EXISTS idx_season_attendees_player_id ON season_attendees(player_id);

-- 6. Add RLS policies for seasons
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_attendees ENABLE ROW LEVEL SECURITY;

-- Seasons policies
CREATE POLICY "Anyone can view seasons" ON seasons FOR SELECT USING (true);
CREATE POLICY "Group members can create seasons" ON seasons FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = seasons.group_id 
      AND player_id = auth.uid()::text
    )
  );

-- Discount codes policies
CREATE POLICY "Anyone can view active discount codes" ON discount_codes FOR SELECT 
  USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- Season attendees policies
CREATE POLICY "Anyone can view season attendees" ON season_attendees FOR SELECT USING (true);
CREATE POLICY "Players can join seasons" ON season_attendees FOR INSERT 
  WITH CHECK (player_id = auth.uid()::text);
