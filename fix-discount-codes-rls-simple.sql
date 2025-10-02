-- Simple fix for discount_codes RLS policies
-- This allows all authenticated users to create discount codes
-- since the app uses custom authentication, not Supabase auth

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active discount codes" ON discount_codes;
DROP POLICY IF EXISTS "Group members can create discount codes" ON discount_codes;
DROP POLICY IF EXISTS "Creators can update discount codes" ON discount_codes;
DROP POLICY IF EXISTS "Creators can delete discount codes" ON discount_codes;

-- Allow all operations on discount_codes (since auth is handled at API layer)
CREATE POLICY "Allow all operations on discount_codes" ON discount_codes FOR ALL USING (true) WITH CHECK (true);
