-- Migration: Add stripe_mode to saved_cards
-- This fixes the issue where test mode payment methods were being used in live mode
-- causing StripeInvalidRequestError when attempting purchases

-- Add stripe_mode column to saved_cards table
ALTER TABLE public.saved_cards
ADD COLUMN stripe_mode TEXT NOT NULL DEFAULT 'test' CHECK (stripe_mode IN ('test', 'live'));

-- Create index for efficient filtering by mode
CREATE INDEX idx_saved_cards_mode ON public.saved_cards(customer_id, stripe_mode);

-- Add comment for documentation
COMMENT ON COLUMN public.saved_cards.stripe_mode IS 'Stripe mode (test or live) when this card was saved';

-- Update existing cards - assume they are from the current mode
-- In production, this should match the mode you were in when cards were created
-- If you were in test mode when creating cards, they should stay as 'test' (the default)
-- If you were already in live mode, run this to update them:
-- UPDATE public.saved_cards SET stripe_mode = 'live' WHERE stripe_mode = 'test';
