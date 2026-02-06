-- Fix punch card purchases that have incorrect total_sessions
-- Punch cards (weekly category passes) were being saved with total_sessions = 999 (unlimited)
-- instead of their actual sessions_included value (e.g., 10 for a 10-pack punch card)

-- Step 1: Fix total_sessions for all pass purchases by looking up the correct value
-- from the passes table
UPDATE public.purchases p
SET
  total_sessions = pass.sessions_included,
  updated_at = NOW()
FROM public.passes pass
WHERE p.product_id = pass.id
  AND p.type IN ('day_pass', 'weekly_pass', 'monthly_pass')
  AND p.total_sessions != pass.sessions_included
  AND p.status IN ('active', 'used', 'expired');

-- Step 2: Re-evaluate status for purchases that were incorrectly marked as 'used'
-- A purchase should only be 'used' if used_sessions >= total_sessions
-- If we just corrected total_sessions upward (e.g., from 1 to 10), some 'used' purchases
-- should be 'active' again
UPDATE public.purchases p
SET
  status = 'active',
  updated_at = NOW()
FROM public.passes pass
WHERE p.product_id = pass.id
  AND p.type IN ('day_pass', 'weekly_pass', 'monthly_pass')
  AND p.status = 'used'
  AND p.used_sessions < p.total_sessions
  -- Don't reactivate if the expiry date has passed
  AND (p.expiry_date IS NULL OR p.expiry_date > NOW())
  AND (p.actual_expiry_date IS NULL OR p.actual_expiry_date > NOW());

-- Step 3: Mark purchases as 'used' where used_sessions >= total_sessions after correction
-- Example: A punch card had total_sessions=999, used_sessions=12. Step 1 corrected it to
-- total_sessions=10. But status stayed 'active' even though 12 >= 10.
UPDATE public.purchases p
SET status = 'used', updated_at = NOW()
FROM public.passes pass
WHERE p.product_id = pass.id
  AND p.type IN ('day_pass', 'weekly_pass', 'monthly_pass')
  AND p.status = 'active'
  AND p.used_sessions >= p.total_sessions;
