-- Seed Script: Populate Passes Table with Services & Pricing
-- Run this in Supabase SQL Editor
-- This version checks for existing passes and only inserts new ones

-- ==================== DAY PASSES ====================

-- Day Pass - Infant ($7.00)
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT
  'Day Pass - Infant',
  'day',
  7.00,
  1,
  1,
  'Single day admission for infants (under 2 years)|Free when accompanied by a toddler',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Day Pass - Infant');

-- Day Pass - Toddler ($17.00)
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT
  'Day Pass - Toddler (2+)',
  'day',
  17.00,
  1,
  1,
  'Single day admission for toddlers (2+ years)|Full access to all play areas|Infant sibling plays free!',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Day Pass - Toddler (2+)');

-- ==================== MONTHLY MEMBERSHIPS ====================

-- Monthly Membership - Infant ($70.00)
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT
  'Monthly Membership - Infant',
  'monthly',
  70.00,
  30,
  999,
  'Unlimited visits for one month|For infants (under 2 years)|Priority booking for events|Member-only discounts',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Monthly Membership - Infant');

-- Monthly Membership - Toddler ($100.00)
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT
  'Monthly Membership - Toddler',
  'monthly',
  100.00,
  30,
  999,
  'Unlimited visits for one month|For toddlers (2+ years)|Priority booking for events|Member-only discounts|Best value for frequent visitors!',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Monthly Membership - Toddler');

-- ==================== PUNCH CARDS (10-Visit) ====================

-- Punch Card (10 passes) - Infant ($50.00)
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT
  'Punch Card (10 passes) - Infant',
  'weekly',
  50.00,
  365,
  10,
  '10 visits for infants (under 2 years)|Never expires for 1 year|Only $5 per visit!|Flexible scheduling',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Punch Card (10 passes) - Infant');

-- Punch Card (10 passes) - Toddler ($150.00)
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT
  'Punch Card (10 passes) - Toddler',
  'weekly',
  150.00,
  365,
  10,
  '10 visits for toddlers (2+ years)|Never expires for 1 year|Only $15 per visit - Save $20!|Flexible scheduling',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Punch Card (10 passes) - Toddler');

-- ==================== VERIFY RESULTS ====================

SELECT
  name,
  category,
  price,
  duration,
  sessions_included,
  is_active,
  created_at
FROM public.passes
ORDER BY category, price;
