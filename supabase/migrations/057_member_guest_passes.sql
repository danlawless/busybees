-- 057_member_guest_passes.sql
--
-- Member guest passes: a monthly member brings a new family's child in free,
-- twice per membership period. A guest visit is a $0 "Guest Pass" day_pass
-- purchase on the FRIEND's account, pointing at the member's membership
-- purchase. Only guest rows dated on or after the membership row's
-- purchase_date count, so a renewal of either style starts the count again
-- at 0: a new membership row (new id), or a legacy subscription renewed in
-- place by the Stripe webhook (same row, purchase_date moved forward).
--
-- Counting and inserting live in one function that locks the membership row,
-- so two requests at once cannot both spend the last pass. Both functions are
-- service-role only: the API route authorizes the caller first.
--
-- Apply by hand in the Supabase SQL Editor. Safe to re-run.

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS guest_of_purchase_id UUID
    REFERENCES public.purchases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchases_guest_of
  ON public.purchases(guest_of_purchase_id)
  WHERE guest_of_purchase_id IS NOT NULL;

-- Never for sale: inactive, so shops, price lists, the /info FAQ and
-- verify-pricing.ts (all filter is_active) never show it.
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT 'Guest Pass', 'day', 0, 1, 1,
       'Member guest pass: one free visit for a family new to Busy Bees, brought by a monthly member. '
       || 'Must stay inactive (never for sale) and must not be renamed: issue_guest_pass finds it by name.',
       false
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Guest Pass');

CREATE OR REPLACE FUNCTION public.issue_guest_pass(
  p_member_id UUID,
  p_guest_customer_id UUID,
  p_child_id UUID,
  p_auto_checkout_time TIMESTAMPTZ,
  p_allowance INT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_membership_id UUID;
  v_membership_date TIMESTAMPTZ;
  v_guest_role TEXT;
  v_used INT;
  v_pass_id UUID;
  v_purchase_id UUID;
  v_session_id UUID;
BEGIN
  IF p_member_id = p_guest_customer_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'same_account');
  END IF;

  -- The member's current membership; the lock serializes every guest pass
  -- spent against it.
  SELECT id, purchase_date INTO v_membership_id, v_membership_date
  FROM public.purchases
  WHERE customer_id = p_member_id
    AND type = 'monthly_pass'
    AND status = 'active'
    AND (COALESCE(actual_expiry_date, expiry_date) IS NULL
         OR COALESCE(actual_expiry_date, expiry_date) > NOW())
  ORDER BY purchase_date DESC
  LIMIT 1
  FOR UPDATE;

  IF v_membership_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_membership');
  END IF;

  -- Lock the friend too, so two members cannot both bring the same new
  -- family in at the same moment.
  SELECT role::TEXT INTO v_guest_role FROM public.users WHERE id = p_guest_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'guest_not_found');
  END IF;
  IF v_guest_role IS DISTINCT FROM 'customer' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'guest_not_customer');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.children WHERE id = p_child_id AND customer_id = p_guest_customer_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'child_not_found');
  END IF;

  -- Net-new only: any purchase at all, of any status, disqualifies.
  IF EXISTS (SELECT 1 FROM public.purchases WHERE customer_id = p_guest_customer_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_new');
  END IF;

  -- This period only: a legacy subscription renews in place, moving the
  -- membership row's purchase_date forward, so older guest rows stop counting.
  SELECT COUNT(*) INTO v_used
  FROM public.purchases
  WHERE guest_of_purchase_id = v_membership_id
    AND (v_membership_date IS NULL OR purchase_date >= v_membership_date);
  IF v_used >= p_allowance THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'none_left');
  END IF;

  SELECT id INTO v_pass_id FROM public.passes WHERE name = 'Guest Pass' LIMIT 1;
  IF v_pass_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_configured');
  END IF;

  INSERT INTO public.purchases (
    customer_id, child_id, type, product_id, name, price,
    purchase_date, expiry_date, used_sessions, total_sessions, status,
    guest_of_purchase_id
  ) VALUES (
    p_guest_customer_id, p_child_id, 'day_pass', v_pass_id, 'Guest Pass', 0,
    NOW(), p_auto_checkout_time, 0, 1, 'active',
    v_membership_id
  )
  RETURNING id INTO v_purchase_id;

  -- consume_session_on_checkin (migration 052) marks the purchase used.
  INSERT INTO public.sessions (customer_id, purchase_id, child_id, auto_checkout_time)
  VALUES (p_guest_customer_id, v_purchase_id, p_child_id, p_auto_checkout_time)
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object(
    'ok', true,
    'purchase_id', v_purchase_id,
    'session_id', v_session_id,
    'remaining', p_allowance - v_used - 1
  );
END;
$$;

-- Undo a guest check-in made by mistake: removes the $0 purchase (its open
-- session goes with it via ON DELETE CASCADE), which gives the member the pass
-- back and leaves the friend with no purchases, still eligible.
-- A finished visit is not a mis-tap and cannot be undone.
CREATE OR REPLACE FUNCTION public.void_guest_pass(p_purchase_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1 FROM public.purchases
  WHERE id = p_purchase_id AND guest_of_purchase_id IS NOT NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sessions WHERE purchase_id = p_purchase_id AND end_time IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'visit_ended');
  END IF;

  DELETE FROM public.purchases WHERE id = p_purchase_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.issue_guest_pass(UUID, UUID, UUID, TIMESTAMPTZ, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.void_guest_pass(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_guest_pass(UUID, UUID, UUID, TIMESTAMPTZ, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.void_guest_pass(UUID) TO service_role;
