-- Test season insert with a real user ID
-- This bypasses the auth.uid() issue by using an actual user

-- First, let's see what users exist
SELECT id, name, email FROM players LIMIT 5;

-- Test season insert using the first available user
INSERT INTO seasons (
    group_id,
    name,
    description,
    season_price,
    individual_game_price,
    total_games,
    season_spots,
    game_spots,
    first_game_date,
    first_game_time,
    repeat_type,
    repeat_interval,
    allow_individual_sales,
    include_organizer_in_count,
    created_by
) VALUES (
    (SELECT id FROM groups LIMIT 1), -- Use first group
    'Test Season',
    'Testing season creation',
    50.00,
    10.00,
    3,
    10,
    10,
    '2024-01-15',
    '18:00:00',
    'weekly',
    1,
    false,
    true,
    (SELECT id FROM players LIMIT 1) -- Use first user
);
