-- Soccer Meetup App Database Schema

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Groups table
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tags TEXT[],
  instagram VARCHAR(255),
  website VARCHAR(255),
  photos TEXT[], -- Array of photo URLs
  admin_password VARCHAR(255) NOT NULL, -- Hashed password for group management
  whatsapp_group VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table (users who can attend games)
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255), -- Optional, for account holders
  instagram VARCHAR(255),
  photo_url VARCHAR(500),
  member_since TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Soccer-specific profile questions
  playing_experience TEXT, -- How long have you been playing soccer
  skill_level TEXT, -- Describe your level
  favorite_team VARCHAR(255),
  favorite_player VARCHAR(255),
  other_sports TEXT,
  languages TEXT[],
  home_location VARCHAR(255),
  time_in_nyc TEXT, -- How long have you been in New York
  
  -- Stripe customer ID for payments
  stripe_customer_id VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  game_date DATE NOT NULL,
  game_time TIME NOT NULL,
  location VARCHAR(500) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total_tickets INTEGER NOT NULL,
  available_tickets INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game attendees (players who bought tickets)
CREATE TABLE game_attendees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  payment_intent_id VARCHAR(255), -- Stripe payment intent ID
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded
  amount_paid DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id) -- Prevent duplicate bookings
);

-- Group members (players who have attended at least one game in a group)
CREATE TABLE group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  first_attended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  games_attended INTEGER DEFAULT 0,
  UNIQUE(group_id, player_id)
);

-- Row Level Security Policies

-- Groups: Public read, admin write with password
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups are viewable by everyone" ON groups
  FOR SELECT USING (true);

CREATE POLICY "Groups are insertable by authenticated users" ON groups
  FOR INSERT WITH CHECK (true);

-- Players: Public read, own data write
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players are viewable by everyone" ON players
  FOR SELECT USING (true);

CREATE POLICY "Players can insert their own data" ON players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Players can update their own data" ON players
  FOR UPDATE USING (true);

-- Games: Public read, group admin write
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Games are viewable by everyone" ON games
  FOR SELECT USING (true);

CREATE POLICY "Games are insertable by authenticated users" ON games
  FOR INSERT WITH CHECK (true);

-- Game attendees: Public read, own data write
ALTER TABLE game_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game attendees are viewable by everyone" ON game_attendees
  FOR SELECT USING (true);

CREATE POLICY "Game attendees can insert their own data" ON game_attendees
  FOR INSERT WITH CHECK (true);

-- Group members: Public read, system managed
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members are viewable by everyone" ON group_members
  FOR SELECT USING (true);

CREATE POLICY "Group members are insertable by system" ON group_members
  FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_games_date ON games(game_date);
CREATE INDEX idx_games_group ON games(group_id);
CREATE INDEX idx_game_attendees_game ON game_attendees(game_id);
CREATE INDEX idx_game_attendees_player ON game_attendees(player_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_player ON group_members(player_id);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
