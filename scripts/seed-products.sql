-- Seed Script: Populate Products Table with POS Items & Pricing
-- Run this in Supabase SQL Editor
-- This version checks for existing products and only inserts new ones
-- Issue #102: POS Products

-- ==================== FOOD ITEMS ====================

-- Apple Sauce Pouch ($3.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT
  'Apple Sauce Pouch',
  'food',
  3.00,
  'Delicious apple sauce pouch - perfect for little ones!',
  '[]'::jsonb,
  TRUE,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Apple Sauce Pouch');

-- Veggie Sticks ($3.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT
  'Veggie Sticks',
  'food',
  3.00,
  'Crunchy veggie sticks - a healthy snack option',
  '[]'::jsonb,
  TRUE,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Veggie Sticks');

-- Goldfish ($3.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT
  'Goldfish',
  'food',
  3.00,
  'Classic Goldfish crackers - the snack that smiles back!',
  '["gluten", "dairy"]'::jsonb,
  TRUE,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Goldfish');

-- Granola Bar ($3.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT
  'Granola Bar',
  'food',
  3.00,
  'Nutritious granola bar - great for energy on the go',
  '["gluten", "tree_nuts"]'::jsonb,
  TRUE,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Granola Bar');

-- Honey Sticks ($1.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT
  'Honey Sticks',
  'food',
  1.00,
  'Sweet honey sticks - a natural treat!',
  '[]'::jsonb,
  TRUE,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Honey Sticks');

-- ==================== RETAIL ITEMS ====================

-- Bee Bracelets ($2.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT
  'Bee Bracelets',
  'retail',
  2.00,
  'Cute bee-themed bracelets - a fun souvenir from Busy Bees!',
  '[]'::jsonb,
  TRUE,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Bee Bracelets');

-- Youth Socks ($3.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT
  'Youth Socks',
  'retail',
  3.00,
  'Cozy youth socks with grip - perfect for play!',
  '[]'::jsonb,
  TRUE,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Youth Socks');

-- Adult Socks ($5.00)
INSERT INTO public.products (name, category, price, description, allergens, is_active, available)
SELECT
  'Adult Socks',
  'retail',
  5.00,
  'Comfortable adult socks with grip - for parents who want to join the fun!',
  '[]'::jsonb,
  TRUE,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Adult Socks');

-- ==================== VERIFY RESULTS ====================

SELECT
  name,
  category,
  price,
  description,
  allergens,
  is_active,
  available,
  created_at
FROM public.products
ORDER BY category, price, name;
