-- Migration: Add web password support for frontend authentication
-- This allows users to log in via phone + password on the website
-- while POS maintains phone-only authentication

-- Add web_password_hash column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS web_password_hash TEXT;

-- Add has_web_password flag to easily check if user has set a web password
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS has_web_password BOOLEAN DEFAULT FALSE;

-- Add last_login column if it doesn't exist (used by POS)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create index for phone lookups (already exists but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- Add comment explaining the authentication architecture
COMMENT ON COLUMN public.users.web_password_hash IS 'Bcrypt-hashed password for web frontend authentication. NULL if user only uses POS (phone-only auth).';
COMMENT ON COLUMN public.users.has_web_password IS 'True if user has set a password for web login. False for POS-only users.';
