/**
 * Customer Data Transform Utilities
 * Shared transforms for converting snake_case database fields to camelCase
 * Used by both POS and My Account for consistent data handling
 */

import type {
  Child,
  Purchase,
  Session,
  SavedCard,
  RawChild,
  RawPurchase,
  RawSession,
  RawSavedCard,
} from '@/lib/types/customer';

/**
 * Calculate age from birthdate
 */
export function calculateAge(birthdate: string): number {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Transform raw child data to camelCase Child interface
 */
export function transformChild(data: RawChild): Child {
  return {
    id: data.id,
    name: data.name,
    birthdate: data.birthdate,
    age: calculateAge(data.birthdate),
    waiverSigned: data.waiver_signed,
    waiverSignedDate: data.waiver_signed_date ?? undefined,
    createdAt: data.created_at,
  };
}

/**
 * Transform raw purchase data to camelCase Purchase interface
 */
export function transformPurchase(data: RawPurchase): Purchase {
  return {
    id: data.id,
    customerId: data.customer_id,
    childId: data.child_id ?? undefined,
    type: data.type,
    productId: data.product_id,
    name: data.name,
    price: data.price,
    purchaseDate: data.purchase_date,
    expiryDate: data.expiry_date ?? undefined,
    firstUseDate: data.first_use_date ?? undefined,
    actualExpiryDate: data.actual_expiry_date ?? undefined,
    usedSessions: data.used_sessions,
    totalSessions: data.total_sessions,
    status: data.status,
    autoRenew: data.auto_renew,
    nextRenewalDate: data.next_renewal_date ?? undefined,
    partyDate: data.party_date ?? undefined,
    partyStartTime: data.party_start_time ?? undefined,
    partyEndTime: data.party_end_time ?? undefined,
    partyGuests: data.party_guests ?? undefined,
    partyNotes: data.party_notes ?? undefined,
    stripePaymentIntentId: data.stripe_payment_intent_id ?? undefined,
    stripeSubscriptionId: data.stripe_subscription_id ?? undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Transform raw session data to camelCase Session interface
 */
export function transformSession(data: RawSession): Session {
  return {
    id: data.id,
    customerId: data.customer_id,
    purchaseId: data.purchase_id,
    childId: data.child_id,
    startTime: data.start_time,
    endTime: data.end_time,
    autoCheckoutTime: data.auto_checkout_time,
    status: data.status,
  };
}

/**
 * Transform raw saved card data to camelCase SavedCard interface
 */
export function transformSavedCard(data: RawSavedCard): SavedCard {
  return {
    id: data.stripe_payment_method_id,
    last4: data.last4,
    brand: data.brand,
    expiryMonth: data.expiry_month,
    expiryYear: data.expiry_year,
    isDefault: data.is_default,
  };
}

/**
 * Transform array of children
 */
export function transformChildren(data: RawChild[]): Child[] {
  return data.map(transformChild);
}

/**
 * Transform array of purchases
 */
export function transformPurchases(data: RawPurchase[]): Purchase[] {
  return data.map(transformPurchase);
}

/**
 * Transform array of sessions
 */
export function transformSessions(data: RawSession[]): Session[] {
  return data.map(transformSession);
}

/**
 * Transform array of saved cards
 */
export function transformSavedCards(data: RawSavedCard[]): SavedCard[] {
  return data.map(transformSavedCard);
}

/**
 * Check if a purchase is complimentary (staff-issued, $0)
 */
export function isComplimentaryPurchase(purchase: Purchase): boolean {
  return purchase.price === 0;
}

/**
 * Check if a purchase has unlimited sessions
 */
export function isUnlimitedPurchase(purchase: Purchase): boolean {
  return purchase.totalSessions === 999;
}

/**
 * Get remaining sessions for a purchase
 */
export function getRemainingSessionsDisplay(purchase: Purchase): string {
  if (isUnlimitedPurchase(purchase)) {
    return 'Unlimited';
  }
  const remaining = Math.max(0, purchase.totalSessions - purchase.usedSessions);
  return `${remaining} of ${purchase.totalSessions} visits remaining`;
}

/**
 * Get session progress percentage (for progress bar)
 */
export function getSessionProgressPercent(purchase: Purchase): number {
  if (isUnlimitedPurchase(purchase)) {
    return 100; // Full bar for unlimited
  }
  if (purchase.totalSessions === 0) {
    return 0;
  }
  const remaining = Math.max(0, purchase.totalSessions - purchase.usedSessions);
  return Math.round((remaining / purchase.totalSessions) * 100);
}
