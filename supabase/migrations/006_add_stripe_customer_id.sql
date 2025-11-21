-- Add Stripe Customer ID to Users Table
-- This allows linking Supabase users to Stripe customers for payment processing

ALTER TABLE public.users
ADD COLUMN stripe_customer_id TEXT UNIQUE;

-- Index for fast lookups by Stripe customer ID
CREATE INDEX idx_users_stripe_customer ON public.users(stripe_customer_id);

-- Comment for documentation
COMMENT ON COLUMN public.users.stripe_customer_id IS 'Stripe customer ID for payment processing';

