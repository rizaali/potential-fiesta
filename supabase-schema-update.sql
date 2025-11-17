-- Update journal_entries table to add AI analysis fields
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS emotion TEXT;

