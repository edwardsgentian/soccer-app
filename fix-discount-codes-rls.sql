-- Fix RLS policies for discount_codes table
-- This script adds the missing INSERT policy for discount codes

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view active discount codes" ON discount_codes;
DROP POLICY IF EXISTS "Group members can create discount codes" ON discount_codes;

-- Recreate the SELECT policy
CREATE POLICY "Anyone can view active discount codes" ON discount_codes FOR SELECT 
  USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- Add the missing INSERT policy for discount codes
CREATE POLICY "Group members can create discount codes" ON discount_codes FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seasons s
      JOIN groups g ON s.group_id = g.id
      JOIN group_members gm ON g.id = gm.group_id
      WHERE s.id = discount_codes.season_id 
      AND gm.player_id = auth.uid()::uuid
    )
    OR
    EXISTS (
      SELECT 1 FROM games g
      JOIN groups gr ON g.group_id = gr.id
      JOIN group_members gm ON gr.id = gm.group_id
      WHERE g.id = discount_codes.game_id 
      AND gm.player_id = auth.uid()::uuid
    )
  );

-- Add UPDATE policy for discount codes (for the creator)
CREATE POLICY "Creators can update discount codes" ON discount_codes FOR UPDATE 
  USING (created_by = auth.uid()::uuid)
  WITH CHECK (created_by = auth.uid()::uuid);

-- Add DELETE policy for discount codes (for the creator)
CREATE POLICY "Creators can delete discount codes" ON discount_codes FOR DELETE 
  USING (created_by = auth.uid()::uuid);
