-- Fix for existing table: Drop and recreate policy if needed
-- Run this in your Supabase SQL Editor

-- First, ensure the table exists
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then recreate it
DROP POLICY IF EXISTS "Allow all operations on journal_entries" ON journal_entries;

-- Create the policy
CREATE POLICY "Allow all operations on journal_entries"
  ON journal_entries
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: Create an index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at DESC);

