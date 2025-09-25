-- Fix RLS policy for seasons table to allow creation
-- This makes the policy more permissive for testing

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Group members can create seasons" ON seasons;

-- Create a more permissive policy that allows any authenticated user to create seasons
CREATE POLICY "Authenticated users can create seasons" ON seasons FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Alternative: Allow anyone to create seasons (for testing)
-- CREATE POLICY "Anyone can create seasons" ON seasons FOR INSERT USING (true);
