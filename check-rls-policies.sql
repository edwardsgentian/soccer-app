-- Check current RLS policies for seasons table
-- This will show us what policies are currently active

-- List all policies on the seasons table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'seasons';

-- Check if RLS is enabled on seasons table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'seasons';
