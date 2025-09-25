-- Test inserting a season with actual data
-- This will get a real group ID and test the insert

-- First, let's see what user we're authenticated as
SELECT auth.uid() as current_user_id;

-- Get the first available group ID
SELECT id, name FROM groups LIMIT 1;

-- Test a simple season insert using the first group
-- Replace 'REPLACE_WITH_ACTUAL_GROUP_ID' with the ID from the query above
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
    (SELECT id FROM groups LIMIT 1), -- Use the first group ID
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
    auth.uid()
);
