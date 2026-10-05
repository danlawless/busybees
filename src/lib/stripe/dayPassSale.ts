/**
 * Day passes for several children, bought online in one charge.
 *
 * The price is worked out here with the same quotePasses the POS uses, so a
 * family pays the same at home as at the front desk: each child's product
 * comes from their age, and the sibling discount comes off the cheaper passes.
 * The browser sends only who is coming and the total it showed.
 */

import {
  quotePasses,
  type ChildLike,
  type PricedLine,
  type SelectablePass,
  type SiblingRule,
} from '@/lib/pos/passSelection';
import { CatalogPriceError, PRICE_CHANGED_ERROR, sameAmount } from '@/lib/stripe/catalogPrice';
import { fromPurchaseRow, hasActiveMembership } from '@/lib/membership';
import type { createAdminClient } from '@/lib/supabase/server';

export interface DayPassChild extends ChildLike {
  waiverSigned: boolean;
}

export interface DayPassSale {
  lines: PricedLine[];
  total: number;
  /** For the charge description and the confirmation email. */
  label: string;
}

/**
 * Price these children's day passes, or refuse: a child without a signed
 * waiver, a child no day pass suits, or a total that is not what was shown.
 */
export function planDayPassSale(
  children: readonly DayPassChild[],
  passes: readonly SelectablePass[],
  siblingRules: readonly SiblingRule[],
  qualifiesForMemberPricing: boolean,
  shownTotal: number
): DayPassSale {
  if (children.length === 0) throw new CatalogPriceError(400, 'Choose who is coming.');

  const unsigned = children.filter((c) => !c.waiverSigned);
  if (unsigned.length > 0) {
    throw new CatalogPriceError(
      400,
      `${unsigned.map((c) => c.name).join(', ')} needs a signed waiver before a day pass can be bought.`
    );
  }

  const quote = quotePasses(children, 'day', passes, siblingRules, qualifiesForMemberPricing);
  if (quote.unresolved.length > 0) {
    throw new CatalogPriceError(
      400,
      `No day pass is available for ${quote.unresolved.map((c) => c.name).join(', ')}.`
    );
  }
  if (!sameAmount(shownTotal, quote.total)) throw new CatalogPriceError(409, PRICE_CHANGED_ERROR);

  const names = quote.lines.map((l) => l.child.name).join(', ');
  return {
    lines: quote.lines,
    total: quote.total,
    label: quote.lines.length === 1 ? `Day Pass (${names})` : `Day Passes × ${quote.lines.length} (${names})`,
  };
}

type Db = ReturnType<typeof createAdminClient>;

/**
 * Load everything the price depends on -- the account's own children, the
 * active passes, the active sibling rules, membership -- and plan the sale.
 * A child id that is not this account's is refused, never priced.
 */
export async function loadDayPassSale(
  db: Db,
  customerId: string,
  childIds: readonly string[],
  shownTotal: number
): Promise<DayPassSale> {
  const ids = [...new Set(childIds)];

  const [childrenRes, passesRes, rulesRes, purchasesRes] = await Promise.all([
    db.from('children').select('id, name, birthdate, waiver_signed').eq('customer_id', customerId).in('id', ids),
    db.from('passes').select('id, name, price, category, sessions_included').eq('is_active', true),
    db.from('sibling_discounts').select('child_position, discount_percent, is_active, applies_to_monthly_only').eq('is_active', true),
    db.from('purchases').select('type, status, expiry_date, actual_expiry_date').eq('customer_id', customerId).eq('type', 'monthly_pass'),
  ]);
  for (const res of [childrenRes, passesRes, rulesRes, purchasesRes]) {
    if (res.error) throw res.error;
  }

  const rows = childrenRes.data ?? [];
  if (rows.length !== ids.length) {
    throw new CatalogPriceError(400, 'One of the children named is not on this account.');
  }

  const children: DayPassChild[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    birthdate: c.birthdate,
    waiverSigned: c.waiver_signed === true,
  }));
  const passes: SelectablePass[] = (passesRes.data ?? []).map((p) => ({ ...p, price: Number(p.price) }));
  const isMember = hasActiveMembership((purchasesRes.data ?? []).map(fromPurchaseRow));

  return planDayPassSale(children, passes, rulesRes.data ?? [], isMember, shownTotal);
}
