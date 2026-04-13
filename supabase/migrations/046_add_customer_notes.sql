-- Add notes column to users table for staff to record customer notes
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notes TEXT;
