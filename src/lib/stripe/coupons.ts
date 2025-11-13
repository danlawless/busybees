/**
 * Stripe Coupon Management Functions
 * Create, update, and delete coupons in Stripe
 */

import { stripe } from './client';
import Stripe from 'stripe';

export interface CreateCouponData {
  id?: string; // Coupon code
  name?: string;
  percent_off?: number; // Percentage discount (1-100)
  amount_off?: number; // Fixed amount discount in cents
  currency?: string;
  duration: 'forever' | 'once' | 'repeating';
  duration_in_months?: number; // Required if duration is 'repeating'
  max_redemptions?: number;
  redeem_by?: number; // Unix timestamp
  metadata?: Record<string, string>;
}

/**
 * Create a coupon in Stripe
 */
export async function createStripeCoupon(data: CreateCouponData): Promise<Stripe.Coupon> {
  return await stripe.coupons.create({
    id: data.id,
    name: data.name,
    percent_off: data.percent_off,
    amount_off: data.amount_off,
    currency: data.currency || 'usd',
    duration: data.duration,
    duration_in_months: data.duration_in_months,
    max_redemptions: data.max_redemptions,
    redeem_by: data.redeem_by,
    metadata: data.metadata || {},
  });
}

/**
 * Update a coupon in Stripe (limited fields)
 */
export async function updateStripeCoupon(
  couponId: string,
  data: { name?: string; metadata?: Record<string, string> }
): Promise<Stripe.Coupon> {
  return await stripe.coupons.update(couponId, {
    name: data.name,
    metadata: data.metadata,
  });
}

/**
 * Delete a coupon in Stripe
 */
export async function deleteStripeCoupon(couponId: string): Promise<Stripe.DeletedCoupon> {
  return await stripe.coupons.del(couponId);
}

/**
 * Get a coupon from Stripe
 */
export async function getStripeCoupon(couponId: string): Promise<Stripe.Coupon> {
  return await stripe.coupons.retrieve(couponId);
}

/**
 * List all coupons from Stripe
 */
export async function listStripeCoupons(): Promise<Stripe.ApiList<Stripe.Coupon>> {
  return await stripe.coupons.list({
    limit: 100,
  });
}

/**
 * Create a promotion code for a coupon
 */
export async function createPromotionCode(
  couponId: string,
  code: string,
  options?: {
    active?: boolean;
    max_redemptions?: number;
    expires_at?: number; // Unix timestamp
    metadata?: Record<string, string>;
  }
): Promise<Stripe.PromotionCode> {
  return await stripe.promotionCodes.create({
    coupon: couponId,
    code,
    active: options?.active ?? true,
    max_redemptions: options?.max_redemptions,
    expires_at: options?.expires_at,
    metadata: options?.metadata || {},
  });
}

/**
 * List promotion codes for a coupon
 */
export async function listPromotionCodes(
  couponId?: string
): Promise<Stripe.ApiList<Stripe.PromotionCode>> {
  return await stripe.promotionCodes.list({
    coupon: couponId,
    limit: 100,
  });
}

