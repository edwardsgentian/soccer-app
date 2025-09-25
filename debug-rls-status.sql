-- Debug RLS status and policies
-- Run this to see the current state

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'seasons';

-- Check current policies
SELECT 
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'seasons';

-- Check if we can insert (this will show the exact error)
INSERT INTO seasons (
    group_id,
    name,
    season_price,
    individual_game_price,
    total_games,
    season_spots,
    game_spots,
    first_game_date,
    first_game_time,
    repeat_type,
    created_by
) VALUES (
    (SELECT id FROM groups LIMIT 1),
    'Test',
    10.00,
    5.00,
    1,
    5,
    5,
    '2024-01-01',
    '12:00:00',
    'weekly',
    (SELECT id FROM players LIMIT 1)
);
