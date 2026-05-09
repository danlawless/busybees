-- Coupons gain a human-readable name and a discount type (amount vs percent).
-- 'amount' coupons use `amount` (existing column).
-- 'percent' coupons use `discount_percent` (1-100); `amount` is null for them.

CREATE TYPE coupon_discount_type AS ENUM ('amount', 'percent');

ALTER TABLE public.coupons
  ADD COLUMN name TEXT,
  ADD COLUMN discount_type coupon_discount_type NOT NULL DEFAULT 'amount',
  ADD COLUMN discount_percent NUMERIC(5,2)
    CHECK (discount_percent IS NULL OR (discount_percent > 0 AND discount_percent <= 100));

-- amount is now optional (only required when discount_type='amount')
ALTER TABLE public.coupons
  ALTER COLUMN amount DROP NOT NULL;

-- Drop the existing positive-amount check so it allows NULL for percent coupons
ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_amount_check;

-- Re-add as: amount is null OR > 0
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_amount_check
    CHECK (amount IS NULL OR amount > 0);

-- Enforce that the value matches the type:
-- amount -> amount IS NOT NULL, discount_percent IS NULL
-- percent -> discount_percent IS NOT NULL, amount IS NULL
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_discount_value_match CHECK (
    (discount_type = 'amount' AND amount IS NOT NULL AND discount_percent IS NULL)
    OR
    (discount_type = 'percent' AND discount_percent IS NOT NULL AND amount IS NULL)
  );
