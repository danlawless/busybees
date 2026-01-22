-- ==================== ADD PURCHASER USER ID TO GIFT CARDS ====================
-- Migration to link gift card purchases to authenticated users

-- Add purchaser_user_id column to track who purchased the gift card
ALTER TABLE public.gift_cards
ADD COLUMN purchaser_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX idx_gift_cards_purchaser_user_id ON public.gift_cards(purchaser_user_id);

-- Update RLS policy for viewing gift cards to include purchaser_user_id
DROP POLICY IF EXISTS "Users can view own gift cards" ON public.gift_cards;

CREATE POLICY "Users can view own gift cards"
  ON public.gift_cards
  FOR SELECT
  USING (
    purchaser_user_id = auth.uid()
    OR purchaser_email = (SELECT email FROM public.users WHERE id = auth.uid())
    OR redeemed_by = auth.uid()
  );
