-- Add group account support to users table
-- Groups are customer accounts representing schools, daycares, church groups, etc.
-- They use the same children, payment, and waiver infrastructure as regular customers.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Partial index for fast group lookups
CREATE INDEX IF NOT EXISTS idx_users_is_group ON public.users(is_group) WHERE is_group = TRUE;
