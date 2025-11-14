-- Add PIN authentication and tracking fields to users table

-- Add PIN hash field for POS authentication
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Add last login timestamp for tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create index on phone for faster POS login lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_pin ON public.users(phone) WHERE pin_hash IS NOT NULL;

-- Add comment explaining PIN usage
COMMENT ON COLUMN public.users.pin_hash IS 'Bcrypt hashed 4-digit PIN for POS quick login';
COMMENT ON COLUMN public.users.last_login IS 'Timestamp of last successful login (POS or portal)';

