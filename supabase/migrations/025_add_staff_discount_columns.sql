-- Migration: Add staff-only discount support for party bookings
-- Issue #190: Staff-only discount codes

-- Add staff-only flag to promos
ALTER TABLE public.promos
ADD COLUMN IF NOT EXISTS is_staff_only BOOLEAN DEFAULT FALSE;

-- Add discount tracking to party_bookings
ALTER TABLE public.party_bookings
ADD COLUMN IF NOT EXISTS applied_promo_id UUID REFERENCES public.promos(id),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_applied_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS discount_applied_at TIMESTAMPTZ;

-- Add index for looking up bookings with discounts
CREATE INDEX IF NOT EXISTS idx_party_bookings_applied_promo_id
ON public.party_bookings(applied_promo_id)
WHERE applied_promo_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.promos.is_staff_only IS 'If true, only staff can apply this discount - no Stripe promotion code is created';
COMMENT ON COLUMN public.party_bookings.applied_promo_id IS 'Reference to the promo/discount applied by staff';
COMMENT ON COLUMN public.party_bookings.discount_applied_by IS 'Staff user who applied the discount';
COMMENT ON COLUMN public.party_bookings.discount_applied_at IS 'When the discount was applied';
