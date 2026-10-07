-- Migration 053: Anyone can read the active sibling discounts
--
-- Applied to production by hand on 30 September 2026 (launch night), via the
-- Supabase SQL Editor. This file records it.
--
-- 015 let only staff and admin read sibling_discounts. /api/sibling-discounts
-- is a public route that reads through the caller's session, so for anyone
-- else it returned an empty list — including the POS once a customer's phone
-- number is looked up, because /api/auth/pos-login signs the browser in as that
-- customer. With no rules the POS priced every sibling at full rate, and the
-- purchase route charges the per-child prices the POS sends. It went unnoticed
-- while the discounts were members-only; from 1 October they apply to everyone.
--
-- The percentages are advertised prices, not secrets. Changing them stays
-- admin-only under the existing policy.

CREATE POLICY "Anyone can read active sibling discounts"
  ON public.sibling_discounts FOR SELECT
  TO anon, authenticated
  USING (is_active);
