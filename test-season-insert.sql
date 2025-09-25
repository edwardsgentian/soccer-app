-- Test inserting a season to see what the actual error is
-- Replace the values with your actual data

-- First, let's see what user we're authenticated as
SELECT auth.uid() as current_user_id;

-- Test a simple season insert (replace with your actual group_id)
-- You'll need to replace 'your-group-id-here' with an actual group ID from your groups table
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
    'your-group-id-here', -- Replace with actual group ID
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
