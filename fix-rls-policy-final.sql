-- Final RLS policy fix - allow anyone to create seasons for testing
-- This removes the authentication requirement

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can create seasons" ON seasons;

-- Create a completely permissive policy for testing
CREATE POLICY "Anyone can create seasons" ON seasons FOR INSERT WITH CHECK (true);

-- Also allow updates and deletes for testing
CREATE POLICY "Anyone can update seasons" ON seasons FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete seasons" ON seasons FOR DELETE USING (true);
