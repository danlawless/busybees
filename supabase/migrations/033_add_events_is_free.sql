-- Add is_free flag to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT false;
