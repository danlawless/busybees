-- Coupons: single-use, fixed-dollar codes redeemable toward day-pass purchases.
-- Created by admin via POS. 365-day expiration from creation. Unused balance is
-- forfeited if the coupon amount exceeds the day-pass price.

CREATE TYPE coupon_status AS ENUM ('active', 'redeemed', 'expired', 'voided');

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  status coupon_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Redemption tracking (single-use; populated when status flips to 'redeemed')
  redeemed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  redeemed_purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  amount_applied NUMERIC(10,2),

  -- Audit
  notes TEXT,
  created_by_admin TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_coupons_status ON public.coupons(status);
CREATE INDEX idx_coupons_expires_at ON public.coupons(expires_at);

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Service-role API routes use the admin client (bypasses RLS).
-- Customers never read this table directly — validation happens via
-- /api/coupons/validate which runs server-side.
