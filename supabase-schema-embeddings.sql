-- Add embedding column to journal_entries table
-- Run this SQL in your Supabase SQL Editor

-- Add embedding column as an array of real numbers
-- OpenAI text-embedding-3-small produces 1536-dimensional embeddings
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS embedding real[];

