/**
 * Cron API Endpoint for Auto-Renewing Monthly Passes
 * Runs daily to charge and renew monthly passes that have auto-renew enabled.
 *
 * Protected by CRON_SECRET environment variable.
 *
 * Selects active monthly passes where auto_renew = true and next_renewal_date
 * has arrived (7 days before expiry). For each one it charges the customer's
 * default saved card off-session, creates the next month's pass (expiry
 * continues from the old pass), and deactivates the old row so it cannot
 * re-trigger.
 *
 * Safety:
 * - A Stripe idempotency key (autorenew_<purchaseId>_<period>) guarantees at
 *   most one charge per pass per billing period, even if the cron runs twice
 *   or retries after a partial failure.
 * - Before creating the renewal pass we check whether one already exists for
 *   this payment intent, so a retried run heals itself instead of duplicating.
 * - On charge failure the pass is left active (auto_renew on) so it retries on
 *   subsequent days within the pre-expiry window; failures are sent to Sentry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  getStripeClient,
  getStripeCustomerIdColumn,
  getStripeMode,
} from '@/lib/stripe/client';
import { getOrCreateStripeCustomer } from '@/lib/stripe/payment-methods';
import { resolvePurchaseDefaults } from '@/lib/utils/purchaseDefaults';
import { sendPurchaseConfirmationEmail, BUSINESS_EMAIL } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

// Renew this many days before expiry — must match the offset used when
// next_renewal_date is written on purchase (purchases/pos and auto-renew toggle).
const RENEW_DAYS_BEFORE_EXPIRY = 7;

interface RenewalOutcome {
  purchaseId: string;
  status: 'renewed' | 'skipped' | 'failed';
  reason?: string;
  newPurchaseId?: string;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('Auto-renew cron: Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = createAdminClient();
    const now = new Date();

    // Find monthly passes due for renewal
    const { data: duePasses, error: fetchError } = await supabase
      .from('purchases')
      .select(
        'id, customer_id, child_id, product_id, name, price, type, status, auto_renew, expiry_date, actual_expiry_date, next_renewal_date',
      )
      .eq('type', 'monthly_pass')
      .eq('status', 'active')
      .eq('auto_renew', true)
      .not('next_renewal_date', 'is', null)
      .lte('next_renewal_date', now.toISOString());

    if (fetchError) {
      logger.error({ error: fetchError }, 'Auto-renew cron: failed to fetch due passes');
      return NextResponse.json(
        { success: false, error: 'Failed to fetch passes due for renewal', details: fetchError.message },
        { status: 500 },
      );
    }

    const passes = duePasses || [];
    logger.info({ count: passes.length }, 'Auto-renew cron: passes due for renewal');

    const stripe = await getStripeClient();
    const stripeMode = await getStripeMode();
    const customerIdColumn = await getStripeCustomerIdColumn();

    const outcomes: RenewalOutcome[] = [];

    for (const pass of passes) {
      try {
        const outcome = await renewPass(pass, {
          supabase,
          stripe,
          stripeMode,
          customerIdColumn,
          now,
        });
        outcomes.push(outcome);
      } catch (err) {
        logger.error({ error: err, purchaseId: pass.id }, 'Auto-renew cron: unexpected error renewing pass');
        Sentry.captureException(err, {
          tags: { component: 'auto-renew-cron', action: 'renew_pass' },
          extra: { purchaseId: pass.id, customerId: pass.customer_id },
        });
        outcomes.push({ purchaseId: pass.id, status: 'failed', reason: 'unexpected_error' });
      }
    }

    const renewed = outcomes.filter((o) => o.status === 'renewed').length;
    const failed = outcomes.filter((o) => o.status === 'failed').length;
    const skipped = outcomes.filter((o) => o.status === 'skipped').length;

    logger.info({ renewed, failed, skipped, total: passes.length }, 'Auto-renew cron: completed');

    return NextResponse.json({
      success: true,
      processed: passes.length,
      renewed,
      failed,
      skipped,
      outcomes,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Auto-renew cron: Unexpected error');
    Sentry.captureException(error, { tags: { component: 'auto-renew-cron' } });
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

type DuePass = {
  id: string;
  customer_id: string;
  child_id: string | null;
  product_id: string | null;
  name: string;
  price: number;
  type: string;
  status: string;
  auto_renew: boolean;
  expiry_date: string | null;
  actual_expiry_date: string | null;
  next_renewal_date: string | null;
};

async function renewPass(
  pass: DuePass,
  ctx: {
    supabase: ReturnType<typeof createAdminClient>;
    stripe: Awaited<ReturnType<typeof getStripeClient>>;
    stripeMode: 'test' | 'live';
    customerIdColumn: 'stripe_customer_id_test' | 'stripe_customer_id_live';
    now: Date;
  },
): Promise<RenewalOutcome> {
  const { supabase, stripe, stripeMode, customerIdColumn, now } = ctx;
  const logContext = { purchaseId: pass.id, customerId: pass.customer_id, source: 'auto-renew-cron' };

  // The effective expiry drives both the billing period key and the new pass's
  // expiry continuity. Prefer actual_expiry_date (set once a pass is used).
  const oldExpiryStr = pass.actual_expiry_date || pass.expiry_date;
  if (!oldExpiryStr) {
    logger.warn(logContext, 'Auto-renew: pass has no expiry date, skipping');
    return { purchaseId: pass.id, status: 'skipped', reason: 'no_expiry_date' };
  }
  const oldExpiry = new Date(oldExpiryStr);

  if (!pass.product_id) {
    logger.warn(logContext, 'Auto-renew: pass has no product_id, skipping');
    return { purchaseId: pass.id, status: 'skipped', reason: 'no_product_id' };
  }

  // Load the customer and their default saved card for the current Stripe mode
  const { data: customer, error: customerError } = await supabase
    .from('users')
    .select('id, email, name, phone, stripe_customer_id_test, stripe_customer_id_live')
    .eq('id', pass.customer_id)
    .single();

  if (customerError || !customer) {
    logger.error({ ...logContext, error: customerError }, 'Auto-renew: customer not found');
    return { purchaseId: pass.id, status: 'failed', reason: 'customer_not_found' };
  }

  const { data: savedCards, error: cardError } = await supabase
    .from('saved_cards')
    .select('stripe_payment_method_id, is_default, last4, brand')
    .eq('customer_id', pass.customer_id)
    .eq('stripe_mode', stripeMode)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (cardError || !savedCards || savedCards.length === 0) {
    logger.warn({ ...logContext, stripeMode }, 'Auto-renew: no saved card on file, cannot charge');
    Sentry.captureMessage('Auto-renew failed: customer has no saved card', {
      level: 'warning',
      tags: { component: 'auto-renew-cron' },
      extra: { ...logContext, stripeMode },
    });
    return { purchaseId: pass.id, status: 'failed', reason: 'no_saved_card' };
  }

  const card = savedCards[0]; // default first, then most recent
  const amountInCents = Math.round(Number(pass.price) * 100);

  // Nothing to charge (e.g. complimentary pass) — renew without hitting Stripe
  let paymentIntentId: string | null = null;

  if (amountInCents > 0) {
    const stripeCustomerId =
      (customerIdColumn === 'stripe_customer_id_test'
        ? customer.stripe_customer_id_test
        : customer.stripe_customer_id_live) ||
      (await getOrCreateStripeCustomer(customer.id, customer.email || '', customer.name || '', customer.phone));

    // Idempotency key ties the charge to this pass + billing period so re-runs
    // and retries never double-charge.
    const periodKey = oldExpiry.toISOString().slice(0, 10); // YYYY-MM-DD
    const idempotencyKey = `autorenew_${pass.id}_${periodKey}`;

    try {
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency: 'usd',
          customer: stripeCustomerId,
          payment_method: card.stripe_payment_method_id,
          description: `Auto-renewal: ${pass.name}`,
          metadata: {
            customer_id: pass.customer_id,
            renewed_from_purchase_id: pass.id,
            product_id: pass.product_id,
            purchase_type: pass.type,
            child_id: pass.child_id || '',
            auto_renew: 'true',
          },
          confirm: true,
          off_session: true,
        },
        { idempotencyKey },
      );

      if (paymentIntent.status !== 'succeeded') {
        logger.warn({ ...logContext, status: paymentIntent.status }, 'Auto-renew: payment not completed');
        return { purchaseId: pass.id, status: 'failed', reason: `payment_${paymentIntent.status}` };
      }

      paymentIntentId = paymentIntent.id;
      logger.info({ ...logContext, paymentIntentId, amountInCents }, '💳 Auto-renew charge succeeded');
    } catch (stripeError) {
      const error = stripeError as { code?: string; message?: string };
      logger.error({ ...logContext, code: error.code, message: error.message }, '❌ Auto-renew charge failed');
      Sentry.captureException(stripeError, {
        tags: { component: 'auto-renew-cron', action: 'charge' },
        extra: { ...logContext, code: error.code },
      });
      // Leave the pass active so the next daily run retries before expiry.
      return { purchaseId: pass.id, status: 'failed', reason: error.code || 'charge_error' };
    }
  }

  // Idempotency guard: if a renewal pass for this payment intent already exists
  // (a prior run charged but failed to finish), don't create a duplicate.
  if (paymentIntentId) {
    const { data: existing } = await supabase
      .from('purchases')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (existing) {
      logger.info({ ...logContext, existingPurchaseId: existing.id }, 'Auto-renew: renewal pass already exists, healing state');
      await deactivateOldPass(supabase, pass.id);
      return { purchaseId: pass.id, status: 'renewed', newPurchaseId: existing.id };
    }
  }

  // Resolve session count and duration from the passes table
  const defaults = await resolvePurchaseDefaults(pass.product_id, pass.type, supabase);
  const durationMs = defaults.expiryDate ? defaults.expiryDate.getTime() - now.getTime() : 30 * 24 * 60 * 60 * 1000;

  // New pass continues from the old expiry so the member keeps unbroken coverage.
  const newExpiry = new Date(oldExpiry.getTime() + durationMs);
  const newRenewalDate = new Date(newExpiry.getTime() - RENEW_DAYS_BEFORE_EXPIRY * 24 * 60 * 60 * 1000);

  const { data: newPurchase, error: insertError } = await supabase
    .from('purchases')
    .insert({
      customer_id: pass.customer_id,
      child_id: pass.child_id,
      type: pass.type,
      product_id: pass.product_id,
      name: pass.name,
      price: pass.price,
      purchase_date: now.toISOString(),
      expiry_date: newExpiry.toISOString(),
      used_sessions: 0,
      total_sessions: defaults.totalSessions,
      status: 'active',
      stripe_payment_intent_id: paymentIntentId,
      auto_renew: true,
      next_renewal_date: newRenewalDate.toISOString(),
    })
    .select()
    .single();

  if (insertError || !newPurchase) {
    // The charge already went through — do NOT deactivate the old pass, and let
    // the idempotency guard above finish the job on the next run.
    logger.error({ ...logContext, error: insertError, paymentIntentId }, '⚠️ Auto-renew: charged but failed to create renewal pass — will retry');
    Sentry.captureException(insertError || new Error('Renewal pass insert returned no row'), {
      tags: { component: 'auto-renew-cron', action: 'create_renewal_pass' },
      extra: { ...logContext, paymentIntentId },
    });
    return { purchaseId: pass.id, status: 'failed', reason: 'renewal_insert_failed' };
  }

  // Copy family-pass child links, if any, onto the renewal pass
  const { data: childLinks } = await supabase
    .from('purchase_children')
    .select('child_id')
    .eq('purchase_id', pass.id);

  if (childLinks && childLinks.length > 0) {
    const rows = childLinks.map((l) => ({ purchase_id: newPurchase.id, child_id: l.child_id }));
    const { error: linkError } = await supabase.from('purchase_children').insert(rows);
    if (linkError) {
      logger.error({ ...logContext, error: linkError, newPurchaseId: newPurchase.id }, 'Auto-renew: failed to copy family-pass child links');
    }
  }

  // Deactivate the old pass so it will not be picked up again; it expires
  // naturally on its own expiry_date.
  await deactivateOldPass(supabase, pass.id);

  // Send the renewal receipt (best-effort). CC the business so staff keep a
  // copy of every automated renewal.
  if (customer.email) {
    try {
      await sendPurchaseConfirmationEmail({
        to: customer.email,
        customerName: customer.name || 'there',
        purchaseName: pass.name,
        purchasePrice: Number(pass.price),
        purchaseType: pass.type,
        expiryDate: newExpiry.toISOString(),
        cc: BUSINESS_EMAIL,
      });
    } catch (emailError) {
      logger.error({ ...logContext, error: emailError }, 'Auto-renew: failed to send renewal receipt');
    }
  }

  logger.info({ ...logContext, newPurchaseId: newPurchase.id, newExpiry: newExpiry.toISOString() }, '✅ Auto-renew completed');
  return { purchaseId: pass.id, status: 'renewed', newPurchaseId: newPurchase.id };
}

async function deactivateOldPass(supabase: ReturnType<typeof createAdminClient>, purchaseId: string): Promise<void> {
  const { error } = await supabase
    .from('purchases')
    .update({ auto_renew: false, next_renewal_date: null })
    .eq('id', purchaseId);
  if (error) {
    logger.error({ error, purchaseId }, 'Auto-renew: failed to deactivate old pass');
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
