-- Fix punch card expiry bugs (Issues #233 & #234)
-- Previous migration 027 fixed total_sessions but didn't fix:
-- 1. The calculate_actual_expiry() trigger treating all day-category passes as single-day
-- 2. The auto_expire_passes() function not checking actual_expiry_date
-- 3. The expiry_date and actual_expiry_date on existing purchases

-- ==================== FIX 1: Update calculate_actual_expiry() trigger ====================
-- The old trigger set ALL day-category passes to expire at end of first use day.
-- Multi-visit punch cards (day category, sessions_included > 1) should use their
-- configured duration instead.

CREATE OR REPLACE FUNCTION calculate_actual_expiry()
RETURNS TRIGGER AS $$
DECLARE
  pass_duration INTEGER;
  pass_category pass_category;
  pass_sessions INTEGER;
BEGIN
  -- Only calculate for passes on first use
  IF NEW.type IN ('day_pass', 'weekly_pass', 'monthly_pass') AND NEW.first_use_date IS NOT NULL AND OLD.first_use_date IS NULL THEN
    -- Get the pass details
    SELECT p.duration, p.category, p.sessions_included INTO pass_duration, pass_category, pass_sessions
    FROM public.passes p
    WHERE p.id = NEW.product_id;

    -- Calculate actual expiry based on category and session count
    IF pass_category = 'day' THEN
      IF pass_sessions > 1 THEN
        -- Multi-visit punch card (e.g., 10-pack): use configured duration from first use
        NEW.actual_expiry_date = NEW.first_use_date + (pass_duration || ' days')::INTERVAL;
      ELSE
        -- Single day pass: end of day (existing behavior)
        NEW.actual_expiry_date = DATE_TRUNC('day', NEW.first_use_date) + INTERVAL '1 day' - INTERVAL '1 second';
      END IF;
    ELSIF pass_category = 'weekly' THEN
      -- Weekly pass expires after configured duration from first use
      NEW.actual_expiry_date = NEW.first_use_date + (pass_duration || ' days')::INTERVAL;
    ELSIF pass_category = 'monthly' THEN
      -- Monthly pass expires after configured duration from first use
      NEW.actual_expiry_date = NEW.first_use_date + (pass_duration || ' days')::INTERVAL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==================== FIX 2: Update auto_expire_passes() ====================
-- Now checks BOTH expiry_date and actual_expiry_date for expiration.
-- A pass is expired if either date has passed (whichever is set).

CREATE OR REPLACE FUNCTION auto_expire_passes()
RETURNS void AS $$
BEGIN
  UPDATE public.purchases
  SET status = 'expired'
  WHERE status = 'active'
    AND (
      -- Expire if the purchase-level expiry date has passed (deadline to start using)
      (expiry_date IS NOT NULL AND expiry_date < NOW())
      OR
      -- Expire if the actual expiry date has passed (set on first use)
      (actual_expiry_date IS NOT NULL AND actual_expiry_date < NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- ==================== FIX 3: Data migration for existing purchases ====================
-- Fix ALL existing multi-visit punch card purchases that got wrong expiry_date
-- and actual_expiry_date values.

-- Step 1: Fix expiry_date to use the pass's actual duration from purchase date
-- This affects purchases where a 10-visit/365-day pass got a 24-hour or 30-day expiry
UPDATE public.purchases pu SET
  expiry_date = pu.purchase_date + (p.duration || ' days')::INTERVAL,
  updated_at = NOW()
FROM public.passes p
WHERE pu.product_id = p.id
  AND p.sessions_included > 1
  AND pu.type IN ('day_pass', 'weekly_pass', 'monthly_pass')
  AND pu.status IN ('active', 'used', 'expired')
  -- Only fix if current expiry is clearly wrong (less than the configured duration)
  AND pu.expiry_date IS NOT NULL
  AND pu.expiry_date < pu.purchase_date + (p.duration || ' days')::INTERVAL;

-- Step 2: Fix actual_expiry_date for multi-visit passes that have been used
-- These got end-of-first-use-day instead of first_use_date + duration
UPDATE public.purchases pu SET
  actual_expiry_date = pu.first_use_date + (p.duration || ' days')::INTERVAL,
  updated_at = NOW()
FROM public.passes p
WHERE pu.product_id = p.id
  AND p.sessions_included > 1
  AND p.category = 'day'
  AND pu.type IN ('day_pass', 'weekly_pass', 'monthly_pass')
  AND pu.first_use_date IS NOT NULL
  AND pu.actual_expiry_date IS NOT NULL
  -- Only fix if actual_expiry is clearly wrong (end of first use day vs full duration)
  AND pu.actual_expiry_date < pu.first_use_date + (p.duration || ' days')::INTERVAL;

-- Step 3: Restore status to active for purchases that were prematurely expired/used
-- but still have unused sessions and haven't truly expired
UPDATE public.purchases pu SET
  status = 'active',
  updated_at = NOW()
FROM public.passes p
WHERE pu.product_id = p.id
  AND p.sessions_included > 1
  AND pu.type IN ('day_pass', 'weekly_pass', 'monthly_pass')
  AND pu.status IN ('used', 'expired')
  AND pu.used_sessions < p.sessions_included
  -- Only reactivate if the corrected expiry hasn't passed
  AND pu.purchase_date + (p.duration || ' days')::INTERVAL > NOW()
  -- Also check actual_expiry if set
  AND (pu.actual_expiry_date IS NULL OR pu.actual_expiry_date > NOW());

-- Step 4: Ensure total_sessions is correct (belt-and-suspenders with migration 027)
UPDATE public.purchases pu SET
  total_sessions = p.sessions_included,
  updated_at = NOW()
FROM public.passes p
WHERE pu.product_id = p.id
  AND p.sessions_included > 1
  AND pu.total_sessions < p.sessions_included
  AND pu.status IN ('active', 'used', 'expired');
