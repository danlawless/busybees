/**
 * API Route: Toggle Auto-Renew for a purchase
 * PATCH - Enable or disable auto-renew on a monthly pass
 *
 * When disabling: cancels the Stripe subscription at period end
 * When enabling: resumes the Stripe subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { cancelStripeSubscription, resumeStripeSubscription } from '@/lib/stripe/subscriptions';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const ToggleSchema = z.object({
  autoRenew: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: purchaseId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ToggleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { autoRenew } = parsed.data;
    const adminSupabase = createAdminClient();

    // Fetch the purchase and verify ownership
    const { data: purchase, error: fetchError } = await adminSupabase
      .from('purchases')
      .select('id, customer_id, type, status, auto_renew, stripe_subscription_id, expiry_date, actual_expiry_date')
      .eq('id', purchaseId)
      .single();

    if (fetchError || !purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Verify the user owns this purchase
    if (purchase.customer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only allow toggling on active monthly passes
    if (purchase.type !== 'monthly_pass') {
      return NextResponse.json({ error: 'Auto-renew can only be toggled on monthly passes' }, { status: 400 });
    }

    if (purchase.status !== 'active') {
      return NextResponse.json({ error: 'Can only toggle auto-renew on active passes' }, { status: 400 });
    }

    // Toggle Stripe subscription if one exists
    if (purchase.stripe_subscription_id) {
      try {
        if (autoRenew) {
          await resumeStripeSubscription(purchase.stripe_subscription_id);
          logger.info({ purchaseId, subscriptionId: purchase.stripe_subscription_id }, 'Stripe subscription resumed');
        } else {
          await cancelStripeSubscription(purchase.stripe_subscription_id, false);
          logger.info({ purchaseId, subscriptionId: purchase.stripe_subscription_id }, 'Stripe subscription set to cancel at period end');
        }
      } catch (stripeErr) {
        logger.error({ error: stripeErr, purchaseId }, 'Failed to update Stripe subscription');
        // Continue to update DB even if Stripe fails — subscription may have been already cancelled
      }
    }

    // Calculate next renewal date when enabling
    let nextRenewalDate: string | null = null;
    if (autoRenew) {
      const expiryDate = purchase.actual_expiry_date || purchase.expiry_date;
      if (expiryDate) {
        const expiry = new Date(expiryDate);
        expiry.setDate(expiry.getDate() - 7); // Renew 7 days before expiry
        nextRenewalDate = expiry.toISOString();
      }
    }

    // Update database
    const { error: updateError } = await adminSupabase
      .from('purchases')
      .update({
        auto_renew: autoRenew,
        next_renewal_date: nextRenewalDate,
      })
      .eq('id', purchaseId);

    if (updateError) {
      logger.error({ error: updateError, purchaseId }, 'Failed to update auto-renew in database');
      return NextResponse.json({ error: 'Failed to update auto-renew' }, { status: 500 });
    }

    logger.info({ purchaseId, autoRenew, userId: user.id }, 'Auto-renew toggled');

    return NextResponse.json({
      success: true,
      autoRenew,
      nextRenewalDate,
    });
  } catch (error) {
    logger.error({ error }, 'Auto-renew toggle error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
