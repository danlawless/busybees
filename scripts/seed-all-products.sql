-- Comprehensive Seed Script: Populate All Product Tables
-- Run this in Supabase SQL Editor BEFORE syncing to Stripe
-- This creates passes, party packages, and products (food/retail)

-- ==================== PASSES ====================

-- Day Pass - Toddler (2+)
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT 'Day Pass - Toddler (2+)', 'day', 17.00, 8, 1,
  'Full day of play for toddlers (ages 2+)! Valid for one entry, expires at closing time.', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Day Pass - Toddler (2+)');

-- Day Pass - Infant
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT 'Day Pass - Infant', 'day', 7.00, 8, 1,
  'Full day of play for infants! Valid for one entry, expires at closing time.', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Day Pass - Infant');

-- Day Pass - Toddler + Infant Discount
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT 'Day Pass - Toddler + Infant Discount', 'day', 17.00, 8, 2,
  'Day pass for toddler and infant together - infant plays free! Best value for siblings.', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Day Pass - Toddler + Infant Discount');

-- Monthly Membership - Toddler
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT 'Monthly Membership - Toddler', 'monthly', 100.00, 30, 999,
  'One month of unlimited play for toddlers! Best value for regular visitors.', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Monthly Membership - Toddler');

-- Monthly Membership - Infant
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT 'Monthly Membership - Infant', 'monthly', 70.00, 30, 999,
  'One month of unlimited play for infants! Best value for regular visitors.', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Monthly Membership - Infant');

-- Punch Card (10 passes) - Toddler
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT 'Punch Card (10 passes) - Toddler', 'weekly', 150.00, 90, 10,
  '10 visits for toddlers! Use within 90 days of first visit.', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Punch Card (10 passes) - Toddler');

-- Punch Card (10 passes) - Infant
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT 'Punch Card (10 passes) - Infant', 'weekly', 50.00, 90, 10,
  '10 visits for infants! Use within 90 days of first visit.', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Punch Card (10 passes) - Infant');


-- ==================== PARTY PACKAGES ====================

-- Queen Bee (Private)
INSERT INTO public.party_packages (name, base_price, capacity, duration, included_items, add_ons, description, is_active)
SELECT 'Queen Bee (Private)', 575.00, 20, 2,
  '["Private party room", "Premium decorations", "Plates, cups, napkins", "Dedicated party host", "Setup & cleanup", "Party favors for all kids", "Digital photo package"]'::jsonb,
  '[{"id": "addon-1", "name": "Extra 30 minutes", "price": 50, "description": "Extend party time"}, {"id": "addon-2", "name": "Additional child (over 15)", "price": 15, "description": "Per extra child"}]'::jsonb,
  'Our premium private party package! Pricing includes 15 kids with pizza, drinks, cake and balloons.', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.party_packages WHERE name = 'Queen Bee (Private)');

-- Worker Bee (Private)
INSERT INTO public.party_packages (name, base_price, capacity, duration, included_items, add_ons, description, is_active)
SELECT 'Worker Bee (Private)', 525.00, 20, 2,
  '["Private party room", "Standard decorations", "Plates, cups, napkins", "Party host", "Setup & cleanup", "Party favors for all kids"]'::jsonb,
  '[{"id": "addon-5", "name": "Extra 30 minutes", "price": 50, "description": "Extend party time"}, {"id": "addon-6", "name": "Additional child (over 15)", "price": 15, "description": "Per extra child"}]'::jsonb,
  'Great private party option that includes 15 kids with pizza and drinks.', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.party_packages WHERE name = 'Worker Bee (Private)');

-- Basic Bee (Private)
INSERT INTO public.party_packages (name, base_price, capacity, duration, included_items, add_ons, description, is_active)
SELECT 'Basic Bee (Private)', 475.00, 20, 2,
  '["Private party room", "Basic decorations", "Plates, cups, napkins", "Party host", "Setup & cleanup"]'::jsonb,
  '[{"id": "addon-9", "name": "Extra 30 minutes", "price": 50, "description": "Extend party time"}, {"id": "addon-10", "name": "Additional child (over 15)", "price": 15, "description": "Per extra child"}]'::jsonb,
  'Perfect private party starter package that includes 15 kids with standard party paper goods.', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.party_packages WHERE name = 'Basic Bee (Private)');

-- Queen Bee (Semi-Private)
INSERT INTO public.party_packages (name, base_price, capacity, duration, included_items, add_ons, description, is_active)
SELECT 'Queen Bee (Semi-Private)', 500.00, 20, 2,
  '["Semi-private party area", "Premium decorations", "Plates, cups, napkins", "Party host", "Setup & cleanup", "Party favors for all kids"]'::jsonb,
  '[{"id": "addon-13", "name": "Extra 30 minutes", "price": 50, "description": "Extend party time"}, {"id": "addon-14", "name": "Additional child (over 15)", "price": 15, "description": "Per extra child"}]'::jsonb,
  'Premium semi-private party! Pricing includes 15 kids with pizza, drinks, cake and balloons.', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.party_packages WHERE name = 'Queen Bee (Semi-Private)');

-- Worker Bee (Semi-Private)
INSERT INTO public.party_packages (name, base_price, capacity, duration, included_items, add_ons, description, is_active)
SELECT 'Worker Bee (Semi-Private)', 450.00, 20, 2,
  '["Semi-private party area", "Standard decorations", "Plates, cups, napkins", "Party host", "Setup & cleanup"]'::jsonb,
  '[{"id": "addon-17", "name": "Extra 30 minutes", "price": 50, "description": "Extend party time"}, {"id": "addon-18", "name": "Additional child (over 15)", "price": 15, "description": "Per extra child"}]'::jsonb,
  'Great semi-private party option that includes 15 kids with pizza and drinks.', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.party_packages WHERE name = 'Worker Bee (Semi-Private)');

-- Basic Bee (Semi-Private)
INSERT INTO public.party_packages (name, base_price, capacity, duration, included_items, add_ons, description, is_active)
SELECT 'Basic Bee (Semi-Private)', 400.00, 20, 2,
  '["Semi-private party area", "Basic decorations", "Plates, cups, napkins", "Party host", "Setup & cleanup"]'::jsonb,
  '[{"id": "addon-21", "name": "Extra 30 minutes", "price": 50, "description": "Extend party time"}, {"id": "addon-22", "name": "Additional child (over 15)", "price": 15, "description": "Per extra child"}]'::jsonb,
  'Perfect semi-private party starter that includes 15 kids with standard party paper goods.', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.party_packages WHERE name = 'Basic Bee (Semi-Private)');


-- ==================== FOOD & RETAIL PRODUCTS ====================

-- Apple Sauce Pouch ($3.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT 'Apple Sauce Pouch', 'food', 3.00,
  'Delicious apple sauce pouch - perfect for little ones!', '[]'::jsonb, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Apple Sauce Pouch');

-- Veggie Sticks ($3.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT 'Veggie Sticks', 'food', 3.00,
  'Crunchy veggie sticks - a healthy snack option', '[]'::jsonb, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Veggie Sticks');

-- Goldfish ($3.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT 'Goldfish', 'food', 3.00,
  'Classic Goldfish crackers - the snack that smiles back!', '["gluten", "dairy"]'::jsonb, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Goldfish');

-- Granola Bar ($3.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT 'Granola Bar', 'food', 3.00,
  'Nutritious granola bar - great for energy on the go', '["gluten", "tree_nuts"]'::jsonb, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Granola Bar');

-- Honey Sticks ($1.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT 'Honey Sticks', 'food', 1.00,
  'Sweet honey sticks - a natural treat!', '[]'::jsonb, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Honey Sticks');

-- Bee Bracelets ($2.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT 'Bee Bracelets', 'retail', 2.00,
  'Cute bee-themed bracelets - a fun souvenir from Busy Bees!', '[]'::jsonb, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Bee Bracelets');

-- Youth Socks ($3.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT 'Youth Socks', 'retail', 3.00,
  'Cozy youth socks with grip - perfect for play!', '[]'::jsonb, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Youth Socks');

-- Adult Socks ($5.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT 'Adult Socks', 'retail', 5.00,
  'Comfortable adult socks with grip - for parents who want to join the fun!', '[]'::jsonb, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Adult Socks');


-- ==================== VERIFY RESULTS ====================

SELECT '--- PASSES ---' as section;
SELECT name, category, price, duration, sessions_included, stripe_product_id
FROM public.passes ORDER BY price;

SELECT '--- PARTY PACKAGES ---' as section;
SELECT name, base_price, capacity, duration, stripe_product_id
FROM public.party_packages ORDER BY base_price;

SELECT '--- PRODUCTS ---' as section;
SELECT name, category, price, stripe_product_id
FROM public.products ORDER BY category, price;

-- Summary counts
SELECT
  (SELECT COUNT(*) FROM public.passes) as passes_count,
  (SELECT COUNT(*) FROM public.party_packages) as parties_count,
  (SELECT COUNT(*) FROM public.products) as products_count,
  (SELECT COUNT(*) FROM public.passes WHERE stripe_product_id IS NOT NULL) as passes_synced,
  (SELECT COUNT(*) FROM public.party_packages WHERE stripe_product_id IS NOT NULL) as parties_synced,
  (SELECT COUNT(*) FROM public.products WHERE stripe_product_id IS NOT NULL) as products_synced;

