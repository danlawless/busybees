/**
 * Membership Discount API
 * Manages the 10% membership discount coupon for party bookings in Stripe
 */

import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { createPromotionCode } from '@/lib/stripe/coupons';
import { logger } from '@/lib/logger';

const MEMBERSHIP_COUPON_ID = 'MEMBER10';
const MEMBERSHIP_DISCOUNT_PERCENT = 10;
const MEMBERSHIP_COUPON_NAME = 'Membership Party Discount';

export interface MembershipDiscountResponse {
  exists: boolean;
  active: boolean;
  couponId: string;
  discountPercent: number;
  promotionCode?: string;
  redemptions?: number;
  error?: string;
}

/**
 * GET - Check the status of the membership discount coupon
 */
export async function GET(): Promise<NextResponse<MembershipDiscountResponse>> {
  try {
    const stripe = await getStripeClient();

    // Try to get the membership coupon from Stripe
    try {
      const coupon = await stripe.coupons.retrieve(MEMBERSHIP_COUPON_ID);

      // Get promotion codes for this coupon
      const promotionCodes = await stripe.promotionCodes.list({
        coupon: MEMBERSHIP_COUPON_ID,
        active: true,
        limit: 1,
      });

      const activePromoCode = promotionCodes.data[0];

      logger.info({ couponId: MEMBERSHIP_COUPON_ID }, 'Retrieved membership discount coupon');

      return NextResponse.json({
        exists: true,
        active: coupon.valid && (activePromoCode?.active ?? false),
        couponId: coupon.id,
        discountPercent: coupon.percent_off || 0,
        promotionCode: activePromoCode?.code,
        redemptions: coupon.times_redeemed || 0,
      });
    } catch (stripeError: unknown) {
      // Coupon doesn't exist yet
      if ((stripeError as { code?: string })?.code === 'resource_missing') {
        logger.info({}, 'Membership discount coupon does not exist yet');
        return NextResponse.json({
          exists: false,
          active: false,
          couponId: MEMBERSHIP_COUPON_ID,
          discountPercent: MEMBERSHIP_DISCOUNT_PERCENT,
        });
      }
      throw stripeError;
    }
  } catch (error) {
    logger.error({ error }, 'Failed to get membership discount status');
    return NextResponse.json(
      {
        exists: false,
        active: false,
        couponId: MEMBERSHIP_COUPON_ID,
        discountPercent: MEMBERSHIP_DISCOUNT_PERCENT,
        error: 'Failed to check membership discount status',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create or enable the membership discount coupon
 */
export async function POST(): Promise<NextResponse<MembershipDiscountResponse>> {
  try {
    const stripe = await getStripeClient();

    let coupon;
    let needsPromoCode = false;

    // Check if coupon exists
    try {
      coupon = await stripe.coupons.retrieve(MEMBERSHIP_COUPON_ID);
      logger.info({ couponId: MEMBERSHIP_COUPON_ID }, 'Membership coupon already exists');
    } catch (stripeError: unknown) {
      if ((stripeError as { code?: string })?.code === 'resource_missing') {
        // Create the coupon
        coupon = await stripe.coupons.create({
          id: MEMBERSHIP_COUPON_ID,
          name: MEMBERSHIP_COUPON_NAME,
          percent_off: MEMBERSHIP_DISCOUNT_PERCENT,
          duration: 'once',
          metadata: {
            type: 'membership_party_discount',
            description: '10% discount for monthly membership holders on party bookings',
          },
        });
        needsPromoCode = true;
        logger.info({ couponId: MEMBERSHIP_COUPON_ID }, 'Created membership discount coupon');
      } else {
        throw stripeError;
      }
    }

    // Check for existing promotion code
    const existingPromoCodes = await stripe.promotionCodes.list({
      coupon: MEMBERSHIP_COUPON_ID,
      limit: 10,
    });

    let promoCode = existingPromoCodes.data.find(pc => pc.code === MEMBERSHIP_COUPON_ID);

    // If there's an inactive promo code, we can't reactivate it in Stripe
    // So we'll create a new one or use an existing active one
    if (!promoCode || !promoCode.active) {
      if (needsPromoCode || !promoCode) {
        // Create a new promotion code using the helper function
        promoCode = await createPromotionCode(
          MEMBERSHIP_COUPON_ID,
          MEMBERSHIP_COUPON_ID,
          {
            active: true,
            metadata: {
              type: 'membership_party_discount',
            },
          }
        );
        logger.info({ promoCode: MEMBERSHIP_COUPON_ID }, 'Created membership promotion code');
      }
    }

    return NextResponse.json({
      exists: true,
      active: true,
      couponId: coupon.id,
      discountPercent: coupon.percent_off || MEMBERSHIP_DISCOUNT_PERCENT,
      promotionCode: promoCode?.code || MEMBERSHIP_COUPON_ID,
      redemptions: coupon.times_redeemed || 0,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create membership discount');
    return NextResponse.json(
      {
        exists: false,
        active: false,
        couponId: MEMBERSHIP_COUPON_ID,
        discountPercent: MEMBERSHIP_DISCOUNT_PERCENT,
        error: 'Failed to create membership discount',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Deactivate the membership discount (deactivates the promotion code)
 */
export async function DELETE(): Promise<NextResponse<MembershipDiscountResponse>> {
  try {
    const stripe = await getStripeClient();

    // Get the promotion code to deactivate
    const promotionCodes = await stripe.promotionCodes.list({
      coupon: MEMBERSHIP_COUPON_ID,
      active: true,
      limit: 10,
    });

    // Deactivate all active promotion codes for this coupon
    for (const promoCode of promotionCodes.data) {
      await stripe.promotionCodes.update(promoCode.id, {
        active: false,
      });
      logger.info({ promoCodeId: promoCode.id }, 'Deactivated membership promotion code');
    }

    // Get the coupon for the response
    let coupon;
    try {
      coupon = await stripe.coupons.retrieve(MEMBERSHIP_COUPON_ID);
    } catch {
      // Coupon doesn't exist
      return NextResponse.json({
        exists: false,
        active: false,
        couponId: MEMBERSHIP_COUPON_ID,
        discountPercent: MEMBERSHIP_DISCOUNT_PERCENT,
      });
    }

    return NextResponse.json({
      exists: true,
      active: false,
      couponId: coupon.id,
      discountPercent: coupon.percent_off || MEMBERSHIP_DISCOUNT_PERCENT,
      redemptions: coupon.times_redeemed || 0,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to deactivate membership discount');
    return NextResponse.json(
      {
        exists: false,
        active: false,
        couponId: MEMBERSHIP_COUPON_ID,
        discountPercent: MEMBERSHIP_DISCOUNT_PERCENT,
        error: 'Failed to deactivate membership discount',
      },
      { status: 500 }
    );
  }
}
