-- Seed Script: Populate Promos Table
-- Run this in Supabase SQL Editor or via psql
-- This script is idempotent - it will skip promos that already exist

-- Insert initial promotional campaigns
INSERT INTO public.promos (
  name,
  start_date,
  end_date,
  discount_percent,
  description,
  stripe_coupon_code,
  banner_style,
  is_active
)
VALUES
  (
    'Early Bee!',
    '2025-10-01',
    '2025-11-20',
    20,
    'Coming soon!  Bee one of the first!',
    'EARLYBEE20',
    'honeycomb',
    TRUE
  ),
  (
    'Black Friday!',
    '2025-11-21',
    '2025-11-30',
    30,
    'Black Friday Deal! (Thanksgiving)',
    'BLACKFRIDAY30',
    'bold-stripes',
    TRUE
  ),
  (
    'Cyber Monday',
    '2025-11-30',
    '2025-12-01',
    40,
    'Cyber Monday!',
    'CYBERMONDAY40',
    'gradient-wave',
    TRUE
  ),
  (
    'Winter Special!',
    '2025-12-01',
    '2025-12-19',
    15,
    'Warm up with winter special!',
    'WINTERSPECIAL15',
    'honeycomb',
    TRUE
  ),
  (
    'Christmas Special!',
    '2025-12-20',
    '2025-12-25',
    25,
    'Merry Christmas this week only!',
    'XMASSGIFT25',
    'confetti',
    TRUE
  ),
  (
    'New Years Special!',
    '2025-12-29',
    '2026-01-01',
    30,
    '2 Day New Years Special',
    'NEWYEARS30',
    'confetti',
    TRUE
  ),
  (
    'Opening Special',
    '2026-01-01',
    '2026-03-01',
    10,
    'Special to leave running for 1st 3 months Opening',
    'GRANDOPEN10',
    'honeycomb',
    TRUE
  )
ON CONFLICT (stripe_coupon_code) DO NOTHING;
-- Note: This requires a unique constraint on stripe_coupon_code
-- If you don't have one, the ON CONFLICT clause will cause an error
-- In that case, remove the ON CONFLICT line and manually check for duplicates

-- Verify the insert
SELECT
  name,
  stripe_coupon_code,
  discount_percent,
  start_date,
  end_date,
  is_active
FROM public.promos
ORDER BY start_date;

