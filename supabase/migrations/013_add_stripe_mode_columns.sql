-- Add separate Stripe customer ID columns for test and live modes
-- This allows seamless switching between test/live keys during development

-- Handle both cases: column exists or doesn't exist
DO $$
BEGIN
    -- Check if old column exists and rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public'
               AND table_name = 'users'
               AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE public.users RENAME COLUMN stripe_customer_id TO stripe_customer_id_test;
    END IF;

    -- Add test column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'users'
                   AND column_name = 'stripe_customer_id_test') THEN
        ALTER TABLE public.users ADD COLUMN stripe_customer_id_test TEXT UNIQUE;
    END IF;

    -- Add live column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'users'
                   AND column_name = 'stripe_customer_id_live') THEN
        ALTER TABLE public.users ADD COLUMN stripe_customer_id_live TEXT UNIQUE;
    END IF;
END $$;

-- Drop old index if exists and create new ones
DROP INDEX IF EXISTS idx_users_stripe_customer;
DROP INDEX IF EXISTS idx_users_stripe_customer_test;
DROP INDEX IF EXISTS idx_users_stripe_customer_live;

CREATE INDEX idx_users_stripe_customer_test ON public.users(stripe_customer_id_test);
CREATE INDEX idx_users_stripe_customer_live ON public.users(stripe_customer_id_live);

-- Update comments
COMMENT ON COLUMN public.users.stripe_customer_id_test IS 'Stripe customer ID for TEST mode (sk_test_*)';
COMMENT ON COLUMN public.users.stripe_customer_id_live IS 'Stripe customer ID for LIVE mode (sk_live_*)';

