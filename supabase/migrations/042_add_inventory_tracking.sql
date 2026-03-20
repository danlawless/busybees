-- ==================== INVENTORY TRACKING ====================
-- Adds quantity_on_hand and low_stock_threshold columns to products table
-- NULL quantity_on_hand means "not tracked" (unlimited) — staff must opt in per product

-- Add inventory columns
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS quantity_on_hand INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

-- Atomic decrement function (race-condition safe via row-level locking)
CREATE OR REPLACE FUNCTION public.decrement_inventory(p_product_id UUID, p_quantity INTEGER DEFAULT 1)
RETURNS public.products AS $$
DECLARE
  result public.products;
BEGIN
  -- If product has no inventory tracking (NULL), return it unchanged
  SELECT * INTO result FROM public.products WHERE id = p_product_id;
  IF result IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  IF result.quantity_on_hand IS NULL THEN
    RETURN result; -- Untracked, skip decrement
  END IF;

  -- Atomic decrement with stock check
  UPDATE public.products
    SET quantity_on_hand = quantity_on_hand - p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id
      AND quantity_on_hand >= p_quantity
    RETURNING * INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;

  -- Auto-mark as unavailable when stock hits 0
  IF result.quantity_on_hand = 0 THEN
    UPDATE public.products SET available = FALSE, updated_at = NOW() WHERE id = p_product_id;
    result.available := FALSE;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
