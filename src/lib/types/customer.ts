/**
 * Shared Customer Types
 * Used by both POS and My Account for consistent data models
 */

export type PurchaseType = 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package' | 'food_beverage' | 'after_dark';
export type PurchaseStatus = 'active' | 'expired' | 'used' | 'refunded';

export interface Child {
  id: string;
  name: string;
  birthdate: string;
  age: number;
  waiverSigned: boolean;
  waiverSignedDate?: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  customerId?: string;
  childId?: string;
  passScope?: string; // 'account' means the pass belongs to the whole account, not one child
  type: PurchaseType;
  productId?: string;
  name: string;
  price: number;
  purchaseDate: string;
  expiryDate?: string;
  firstUseDate?: string;
  actualExpiryDate?: string;
  usedSessions: number;
  totalSessions: number;
  status: PurchaseStatus;
  autoRenew?: boolean;
  nextRenewalDate?: string;
  partyDate?: string;
  partyStartTime?: string;
  partyEndTime?: string;
  partyGuests?: number;
  partyNotes?: string;
  stripePaymentIntentId?: string;
  stripeSubscriptionId?: string;
  giftCardAmountUsed?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Session {
  id: string;
  customerId: string;
  purchaseId: string;
  childId?: string;
  startTime: string;
  endTime?: string;
  autoCheckoutTime?: string;
  status: 'active' | 'completed';
}

export interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  role: 'customer' | 'staff' | 'admin';
  children: Child[];
  purchases: Purchase[];
  activeSessions: Session[];
  savedCards: SavedCard[];
  giftCardBalance: number;
  createdAt: string;
  lastVisit?: string;
}

/**
 * Raw database types (snake_case) for API responses
 */
export interface RawChild {
  id: string;
  customer_id: string;
  name: string;
  birthdate: string;
  waiver_signed: boolean;
  waiver_signed_date?: string | null;
  created_at: string;
}

export interface RawPurchase {
  id: string;
  customer_id: string;
  child_id?: string | null;
  type: PurchaseType;
  product_id: string;
  name: string;
  price: number;
  purchase_date: string;
  expiry_date?: string | null;
  first_use_date?: string | null;
  actual_expiry_date?: string | null;
  used_sessions: number;
  total_sessions: number;
  status: PurchaseStatus;
  auto_renew: boolean;
  next_renewal_date?: string | null;
  party_date?: string | null;
  party_start_time?: string | null;
  party_end_time?: string | null;
  party_guests?: number | null;
  party_notes?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_subscription_id?: string | null;
  gift_card_amount_used?: number | null;
  created_at: string;
  updated_at: string;
}

export interface RawSession {
  id: string;
  customer_id: string;
  purchase_id: string;
  child_id?: string;
  start_time: string;
  end_time?: string;
  auto_checkout_time?: string;
  status: 'active' | 'completed';
}

export interface RawSavedCard {
  id?: string;
  stripe_payment_method_id: string;
  last4: string;
  brand: string;
  expiry_month: number;
  expiry_year: number;
  is_default: boolean;
}
