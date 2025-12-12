-- ==================== GIFT CARD SYSTEM ====================
-- Migration to add gift card functionality

-- ==================== ENUMS ====================

CREATE TYPE gift_card_status AS ENUM ('pending', 'sent', 'redeemed', 'partially_redeemed');
CREATE TYPE gift_card_delivery_method AS ENUM ('email_recipient', 'email_self');

-- ==================== TABLES ====================

-- Gift card denominations (admin-configurable amounts)
CREATE TABLE public.gift_card_denominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gift_card_denominations_active ON public.gift_card_denominations(is_active);
CREATE INDEX idx_gift_card_denominations_sort ON public.gift_card_denominations(sort_order);

-- Gift cards table
CREATE TABLE public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  remaining_amount NUMERIC(10,2) NOT NULL CHECK (remaining_amount >= 0),

  -- Purchaser info
  purchaser_email TEXT NOT NULL,
  purchaser_name TEXT NOT NULL,

  -- Recipient info
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  personal_message TEXT,

  -- Delivery
  delivery_method gift_card_delivery_method NOT NULL,
  email_sent_at TIMESTAMP WITH TIME ZONE,

  -- Status tracking
  status gift_card_status DEFAULT 'pending',

  -- Redemption tracking
  redeemed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE,

  -- Payment tracking
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gift_cards_code ON public.gift_cards(code);
CREATE INDEX idx_gift_cards_status ON public.gift_cards(status);
CREATE INDEX idx_gift_cards_purchaser ON public.gift_cards(purchaser_email);
CREATE INDEX idx_gift_cards_recipient ON public.gift_cards(recipient_email);
CREATE INDEX idx_gift_cards_redeemed_by ON public.gift_cards(redeemed_by);
CREATE INDEX idx_gift_cards_payment_intent ON public.gift_cards(stripe_payment_intent_id);

-- Gift card redemption history (for tracking partial redemptions)
CREATE TABLE public.gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  balance_before NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gift_card_redemptions_gift_card ON public.gift_card_redemptions(gift_card_id);
CREATE INDEX idx_gift_card_redemptions_user ON public.gift_card_redemptions(user_id);

-- ==================== SCHEMA UPDATES ====================

-- Add gift card balance to users table
ALTER TABLE public.users
ADD COLUMN gift_card_balance NUMERIC(10,2) DEFAULT 0 CHECK (gift_card_balance >= 0);

-- ==================== TRIGGERS ====================

CREATE TRIGGER update_gift_card_denominations_updated_at
  BEFORE UPDATE ON public.gift_card_denominations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gift_cards_updated_at
  BEFORE UPDATE ON public.gift_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== SEED DEFAULT DENOMINATIONS ====================

INSERT INTO public.gift_card_denominations (amount, is_active, sort_order) VALUES
  (25.00, TRUE, 1),
  (50.00, TRUE, 2),
  (75.00, TRUE, 3),
  (100.00, TRUE, 4);

-- ==================== RLS POLICIES ====================

-- Enable RLS on new tables
ALTER TABLE public.gift_card_denominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_redemptions ENABLE ROW LEVEL SECURITY;

-- Gift card denominations: Anyone can read active denominations
CREATE POLICY "Anyone can read active gift card denominations"
  ON public.gift_card_denominations
  FOR SELECT
  USING (is_active = TRUE);

-- Gift card denominations: Only admins can manage
CREATE POLICY "Admins can manage gift card denominations"
  ON public.gift_card_denominations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Gift cards: Users can view their own purchased or redeemed cards
CREATE POLICY "Users can view own gift cards"
  ON public.gift_cards
  FOR SELECT
  USING (
    purchaser_email = (SELECT email FROM public.users WHERE id = auth.uid())
    OR redeemed_by = auth.uid()
  );

-- Gift cards: Anyone can create (for purchase flow)
CREATE POLICY "Anyone can create gift cards"
  ON public.gift_cards
  FOR INSERT
  WITH CHECK (TRUE);

-- Gift cards: Staff/Admin can view all and manage
CREATE POLICY "Staff can view all gift cards"
  ON public.gift_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

CREATE POLICY "Staff can update gift cards"
  ON public.gift_cards
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- Gift card redemptions: Users can view their own
CREATE POLICY "Users can view own redemptions"
  ON public.gift_card_redemptions
  FOR SELECT
  USING (user_id = auth.uid());

-- Gift card redemptions: Staff can view all
CREATE POLICY "Staff can view all redemptions"
  ON public.gift_card_redemptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- Gift card redemptions: System can insert (via service role)
CREATE POLICY "System can insert redemptions"
  ON public.gift_card_redemptions
  FOR INSERT
  WITH CHECK (TRUE);

