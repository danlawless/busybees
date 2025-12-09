-- Seed Script: Populate Promos Table (Safe - Checks for Duplicates)
-- Run this in Supabase SQL Editor
-- This version checks for existing promos and only inserts new ones

-- Insert Early Bee promo if it doesn't exist
INSERT INTO public.promos (name, start_date, end_date, discount_percent, description, stripe_coupon_code, banner_style, is_active)
SELECT 'Early Bee!', '2024-10-01', '2024-11-20', 20, 'Coming soon!  Bee one of the first!', 'EARLYBEE20', 'honeycomb', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.promos WHERE stripe_coupon_code = 'EARLYBEE20');

-- Insert Black Friday promo if it doesn't exist
INSERT INTO public.promos (name, start_date, end_date, discount_percent, description, stripe_coupon_code, banner_style, is_active)
SELECT 'Black Friday!', '2024-11-21', '2024-11-30', 30, 'Black Friday Deal! (Thanksgiving)', 'BLACKFRIDAY30', 'bold-stripes', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.promos WHERE stripe_coupon_code = 'BLACKFRIDAY30');

-- Insert Cyber Monday promo if it doesn't exist
INSERT INTO public.promos (name, start_date, end_date, discount_percent, description, stripe_coupon_code, banner_style, is_active)
SELECT 'Cyber Monday', '2024-11-30', '2024-12-01', 40, 'Cyber Monday!', 'CYBERMONDAY40', 'gradient-wave', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.promos WHERE stripe_coupon_code = 'CYBERMONDAY40');

-- Insert Winter Special promo if it doesn't exist
INSERT INTO public.promos (name, start_date, end_date, discount_percent, description, stripe_coupon_code, banner_style, is_active)
SELECT 'Winter Special!', '2024-12-01', '2024-12-19', 15, 'Warm up with winter special!', 'WINTERSPECIAL15', 'honeycomb', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.promos WHERE stripe_coupon_code = 'WINTERSPECIAL15');

-- Insert Christmas Special promo if it doesn't exist
INSERT INTO public.promos (name, start_date, end_date, discount_percent, description, stripe_coupon_code, banner_style, is_active)
SELECT 'Christmas Special!', '2024-12-20', '2024-12-25', 25, 'Merry Christmas this week only!', 'XMASSGIFT25', 'confetti', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.promos WHERE stripe_coupon_code = 'XMASSGIFT25');

-- Insert New Years Special promo if it doesn't exist
INSERT INTO public.promos (name, start_date, end_date, discount_percent, description, stripe_coupon_code, banner_style, is_active)
SELECT 'New Years Special!', '2024-12-29', '2025-01-01', 30, '2 Day New Years Special', 'NEWYEARS30', 'confetti', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.promos WHERE stripe_coupon_code = 'NEWYEARS30');

-- Insert Opening Special promo if it doesn't exist
INSERT INTO public.promos (name, start_date, end_date, discount_percent, description, stripe_coupon_code, banner_style, is_active)
SELECT 'Opening Special', '2025-01-01', '2025-03-01', 10, 'Special to leave running for 1st 3 months Opening', 'GRANDOPEN10', 'honeycomb', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.promos WHERE stripe_coupon_code = 'GRANDOPEN10');

-- Verify the results
SELECT
  name,
  stripe_coupon_code,
  discount_percent,
  start_date,
  end_date,
  is_active,
  created_at
FROM public.promos
ORDER BY start_date;

