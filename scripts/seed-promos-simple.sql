-- Seed Script: Populate Promos Table (Simple Version)
-- Run this in Supabase SQL Editor
-- WARNING: This will create duplicates if run multiple times

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
  ('Early Bee!', '2024-10-01', '2024-11-20', 20, 'Coming soon!  Bee one of the first!', 'EARLYBEE20', 'honeycomb', TRUE),
  ('Black Friday!', '2024-11-21', '2024-11-30', 30, 'Black Friday Deal! (Thanksgiving)', 'BLACKFRIDAY30', 'bold-stripes', TRUE),
  ('Cyber Monday', '2024-11-30', '2024-12-01', 40, 'Cyber Monday!', 'CYBERMONDAY40', 'gradient-wave', TRUE),
  ('Winter Special!', '2024-12-01', '2024-12-19', 15, 'Warm up with winter special!', 'WINTERSPECIAL15', 'honeycomb', TRUE),
  ('Christmas Special!', '2024-12-20', '2024-12-25', 25, 'Merry Christmas this week only!', 'XMASSGIFT25', 'confetti', TRUE),
  ('New Years Special!', '2024-12-29', '2025-01-01', 30, '2 Day New Years Special', 'NEWYEARS30', 'confetti', TRUE),
  ('Opening Special', '2025-01-01', '2025-03-01', 10, 'Special to leave running for 1st 3 months Opening', 'GRANDOPEN10', 'honeycomb', TRUE);

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

