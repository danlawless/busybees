-- Add inline pricing fields to events table
-- This allows setting toddler/infant prices directly on the event
-- without needing to create separate passes

ALTER TABLE events ADD COLUMN IF NOT EXISTS toddler_price NUMERIC(10,2);
ALTER TABLE events ADD COLUMN IF NOT EXISTS infant_price NUMERIC(10,2);
