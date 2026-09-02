/**
 * Membership status and member benefits.
 *
 * Active monthly pass holders get an automatic 10% discount on party bookings
 * and on food & retail at the counter. Membership is a status derived from the
 * customer's purchases — never a code the customer has to supply or staff have
 * to remember to apply.
 *
 * This module is the single source of truth for both the percentage and the
 * "is this customer a member?" test, so the POS, the booking flow and the
 * membership API can never drift apart.
 */

/** Discount applied to parties and to food & retail for active members. */
export const MEMBERSHIP_DISCOUNT_PERCENT = 10;

/** Purchase types the member discount applies to at the counter. */
export const MEMBER_DISCOUNTABLE_TYPES = ['food_beverage'] as const;

/**
 * The subset of a purchase needed to judge membership. Kept structural so both
 * the snake_case database row and the camelCase POS shape satisfy it.
 */
export interface MembershipPurchase {
  type: string;
  status: string;
  expiryDate?: string | null;
  actualExpiryDate?: string | null;
}

/**
 * True when this purchase is a monthly pass that is active and has not passed
 * its expiry date.
 *
 * Status alone isn't enough: records exist that are still marked `active` while
 * carrying a past expiry date, and a lapsed pass must not earn a discount. When
 * a pass has both an actual (first-use derived) and a nominal expiry, the actual
 * one wins — it's the date the rest of the system counts down to.
 */
export function isActiveMembership(
  purchase: MembershipPurchase,
  now: Date = new Date()
): boolean {
  if (purchase.type !== 'monthly_pass') return false;
  if (purchase.status !== 'active') return false;

  const expiry = purchase.actualExpiryDate ?? purchase.expiryDate;
  if (!expiry) return true;

  const expiryTime = new Date(expiry).getTime();
  if (Number.isNaN(expiryTime)) return true;

  return expiryTime > now.getTime();
}

/** True when any of these purchases is a live monthly membership. */
export function hasActiveMembership(
  purchases: readonly MembershipPurchase[] | null | undefined,
  now: Date = new Date()
): boolean {
  return (purchases ?? []).some((p) => isActiveMembership(p, now));
}

/**
 * Normalize a database purchase row (snake_case) into the shape the membership
 * helpers expect.
 */
export function fromPurchaseRow(row: {
  type: string;
  status: string;
  expiry_date?: string | null;
  actual_expiry_date?: string | null;
}): MembershipPurchase {
  return {
    type: row.type,
    status: row.status,
    expiryDate: row.expiry_date,
    actualExpiryDate: row.actual_expiry_date,
  };
}

/** The member price for an amount, rounded to whole cents. */
export function applyMemberDiscount(amount: number, isMember: boolean): number {
  if (!isMember) return amount;
  return Math.round(amount * (1 - MEMBERSHIP_DISCOUNT_PERCENT / 100) * 100) / 100;
}

/** True when the member discount applies to this kind of counter purchase. */
export function isMemberDiscountable(purchaseType: string): boolean {
  return (MEMBER_DISCOUNTABLE_TYPES as readonly string[]).includes(purchaseType);
}
