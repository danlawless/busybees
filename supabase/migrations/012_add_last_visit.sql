-- Migration: Add last_visit column to users table
-- This column tracks the most recent visit/activity for customers

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_visit TIMESTAMP WITH TIME ZONE;

-- Add index for efficient sorting by last visit
CREATE INDEX IF NOT EXISTS idx_users_last_visit ON public.users(last_visit);

-- Comment for documentation
COMMENT ON COLUMN public.users.last_visit IS 'Timestamp of last visit to the play center (updated on session check-in)';
