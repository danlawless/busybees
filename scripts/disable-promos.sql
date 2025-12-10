-- Disable Promos Script: Disable all promos by setting is_active to false
-- Run this in Supabase SQL Editor to disable all active promotions
-- This preserves all data and dates - just toggles is_active flag off

-- Disable all promos by setting is_active = false
-- This is the most reliable way to disable promos as the isPromoActive()
-- function checks this flag first before checking dates
UPDATE public.promos
SET
  is_active = false,
  updated_at = NOW();

-- Verify the update
SELECT
  name,
  stripe_coupon_code,
  discount_percent,
  start_date,
  end_date,
  is_active,
  CASE
    WHEN is_active = false THEN 'DISABLED (is_active=false)'
    WHEN CURRENT_DATE BETWEEN start_date AND end_date THEN 'ACTIVE NOW'
    WHEN CURRENT_DATE < start_date THEN 'SCHEDULED'
    ELSE 'EXPIRED'
  END as status
FROM public.promos
ORDER BY start_date;

