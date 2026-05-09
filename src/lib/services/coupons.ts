/**
 * Coupon Service
 * Single-use, fixed-dollar codes redeemable toward day-pass purchases.
 * 365-day expiration. Unused balance is forfeited at redemption (single-use rule).
 */

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { randomBytes } from 'crypto';

export type CouponStatus = 'active' | 'redeemed' | 'expired' | 'voided';

export interface Coupon {
  id: string;
  code: string;
  amount: number;
  status: CouponStatus;
  expires_at: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
  redeemed_purchase_id: string | null;
  amount_applied: number | null;
  notes: string | null;
  created_by_admin: string | null;
  created_at: string;
  updated_at: string;
}

const CODE_PREFIX = 'BBCP';
const EXPIRY_DAYS = 365;

/**
 * Generate a unique coupon code: BBCP-XXXX-XXXX-XXXX
 */
export function generateCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1
  const segments: string[] = [];
  for (let i = 0; i < 3; i++) {
    let segment = '';
    const bytes = randomBytes(4);
    for (let j = 0; j < 4; j++) {
      segment += chars[bytes[j] % chars.length];
    }
    segments.push(segment);
  }
  return `${CODE_PREFIX}-${segments.join('-')}`;
}

export function isValidCouponCodeFormat(code: string): boolean {
  return /^BBCP-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code.toUpperCase());
}

/**
 * Create a new coupon. Auto-generates a unique code; expires in 365 days.
 */
export async function createCoupon(input: {
  amount: number;
  notes?: string;
  createdByAdmin?: string;
}): Promise<Coupon> {
  if (input.amount <= 0) throw new Error('Coupon amount must be positive');

  const supabase = createAdminClient();
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Retry on the (extremely unlikely) collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCouponCode();
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code,
        amount: input.amount,
        status: 'active',
        expires_at: expiresAt,
        notes: input.notes || null,
        created_by_admin: input.createdByAdmin || null,
      })
      .select()
      .single();

    if (!error && data) return data as Coupon;
    if (error && error.code !== '23505') {
      logger.error({ error }, 'Failed to create coupon');
      throw error;
    }
  }
  throw new Error('Failed to generate unique coupon code');
}

/**
 * Look up a coupon by code (case-insensitive). Does not enforce status checks.
 */
export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (error) {
    logger.error({ error, code }, 'Failed to fetch coupon by code');
    return null;
  }
  return (data as Coupon) || null;
}

export interface ValidateCouponResult {
  valid: boolean;
  coupon?: Coupon;
  error?: string;
}

/**
 * Validate a coupon code: must exist, be 'active', and not expired.
 */
export async function validateCoupon(code: string): Promise<ValidateCouponResult> {
  if (!isValidCouponCodeFormat(code)) {
    return { valid: false, error: 'Invalid coupon code format' };
  }

  const coupon = await getCouponByCode(code);
  if (!coupon) return { valid: false, error: 'Coupon code not found' };

  if (coupon.status === 'redeemed') return { valid: false, error: 'This coupon has already been redeemed' };
  if (coupon.status === 'voided') return { valid: false, error: 'This coupon has been voided' };
  if (coupon.status === 'expired' || new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: 'This coupon has expired' };
  }

  return { valid: true, coupon };
}

export interface RedeemCouponResult {
  success: boolean;
  amountApplied?: number;
  forfeited?: number;
  error?: string;
}

/**
 * Atomically mark a coupon redeemed against a day-pass purchase.
 * Uses a conditional update on status='active' so concurrent redemptions can't double-spend.
 *
 * Per single-use rule: any coupon balance above the pass price is forfeited.
 *
 * @param code Coupon code (any case)
 * @param userId Customer redeeming
 * @param purchaseId The day-pass purchase being credited
 * @param passPrice The price of the pass (cap on amount applied)
 */
export async function redeemCoupon(
  code: string,
  userId: string,
  purchaseId: string,
  passPrice: number,
): Promise<RedeemCouponResult> {
  const validation = await validateCoupon(code);
  if (!validation.valid || !validation.coupon) {
    return { success: false, error: validation.error || 'Invalid coupon' };
  }

  const coupon = validation.coupon;
  const amountApplied = Math.min(coupon.amount, passPrice);
  const forfeited = Math.max(0, coupon.amount - passPrice);

  const supabase = createAdminClient();

  // Atomic state transition: only redeem if still 'active'
  const { data, error } = await supabase
    .from('coupons')
    .update({
      status: 'redeemed',
      redeemed_by: userId,
      redeemed_at: new Date().toISOString(),
      redeemed_purchase_id: purchaseId,
      amount_applied: amountApplied,
    })
    .eq('id', coupon.id)
    .eq('status', 'active')
    .select()
    .single();

  if (error || !data) {
    logger.warn({ error, code, couponId: coupon.id }, 'Coupon redemption race / already redeemed');
    return { success: false, error: 'This coupon has already been redeemed' };
  }

  logger.info({ couponId: coupon.id, userId, purchaseId, amountApplied, forfeited }, '🎟️ Coupon redeemed');
  return { success: true, amountApplied, forfeited };
}

/**
 * Void an active coupon (admin action). Does not refund anything since coupons aren't paid for.
 */
export async function voidCoupon(couponId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('coupons')
    .update({ status: 'voided' })
    .eq('id', couponId)
    .eq('status', 'active')
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: 'Coupon not found or already used/voided' };
  }
  return { success: true };
}

/**
 * List all coupons (paginated to bypass Supabase 1000-row cap).
 */
export async function listCoupons(): Promise<Coupon[]> {
  const supabase = createAdminClient();
  const PAGE_SIZE = 1000;
  const all: Coupon[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      logger.error({ error }, 'Failed to list coupons');
      throw error;
    }
    const rows = (data || []) as Coupon[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}
