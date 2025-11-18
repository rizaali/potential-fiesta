-- Add embedding column to journal_entries table
-- Run this SQL in your Supabase SQL Editor

-- Add embedding column as an array of real numbers (384 dimensions)
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS embedding real[];

