-- Disable Promos Script: Set all promo dates to last year
-- Run this in Supabase SQL Editor to disable all active promotions
-- This preserves all data but sets dates to 2024 so no promos will be active

-- Update all promos to have dates from last year (2024)
UPDATE public.promos
SET
  start_date = start_date - INTERVAL '1 year',
  end_date = end_date - INTERVAL '1 year',
  updated_at = NOW()
WHERE start_date >= '2025-01-01';

-- Verify the update
SELECT
  name,
  stripe_coupon_code,
  discount_percent,
  start_date,
  end_date,
  is_active,
  CASE
    WHEN CURRENT_DATE BETWEEN start_date AND end_date THEN 'ACTIVE NOW'
    WHEN CURRENT_DATE < start_date THEN 'SCHEDULED'
    ELSE 'EXPIRED (disabled)'
  END as status
FROM public.promos
ORDER BY start_date;

