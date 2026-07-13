/**
 * One-off Manual Renewal: Amy Sabbio
 *
 * Amy's Monthly Membership - Child (auto-renew ON) expired on 7/10/2026 without
 * being charged, because the auto-renew cron did not exist at the time. This
 * script performs the renewal that should have happened: it charges her saved
 * card $100 off-session and creates a fresh active monthly pass.
 *
 * Because her pass already lapsed (coverage gap since 7/10), the new pass runs
 * a FULL month from today rather than being backdated, and auto-renew is carried
 * forward so the new /api/cron/auto-renew handles her going forward.
 *
 * SAFETY:
 * - DRY RUN by default. It prints exactly what it will do and charges nothing.
 * - Pass --confirm to actually charge the card and create the pass.
 * - A Stripe idempotency key makes re-running with --confirm safe (no double charge).
 *
 * USAGE:
 *   npx tsx scripts/renew-amy-sabbio.ts            # dry run (no charge)
 *   npx tsx scripts/renew-amy-sabbio.ts --confirm  # charge + renew for real
 *
 * PREREQUISITES (in .env.local or environment):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   Stripe secret key: read from the `settings` table (stripe_secret_key),
 *   falling back to STRIPE_SECRET_KEY.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

// --- Target customer -------------------------------------------------------
const TARGET_PHONE = '9784243940';
const TARGET_NAME = 'Amy Sabbio';
const RENEW_DAYS_BEFORE_EXPIRY = 7;
const MONTHLY_DURATION_DAYS = 30; // fallback if the passes row has no duration

const CONFIRM = process.argv.slice(2).includes('--confirm');

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};
const log = (m: string, color: keyof typeof c = 'reset') => console.log(`${c[color]}${m}${c.reset}`);

async function main() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', 'red');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Resolve the Stripe secret key the same way the app does (settings table → env)
  const { data: settings } = await supabase
    .from('settings')
    .select('key, value')
    .eq('key', 'stripe_secret_key')
    .maybeSingle();

  const secretKey = settings?.value || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    log('❌ No Stripe secret key found (settings.stripe_secret_key or STRIPE_SECRET_KEY)', 'red');
    process.exit(1);
  }
  const stripeMode: 'test' | 'live' = secretKey.startsWith('sk_live_') ? 'live' : 'test';
  const stripe = new Stripe(secretKey, { apiVersion: '2024-11-20.acacia', typescript: true });

  log('', 'reset');
  log('════════════════════════════════════════════════════════════', 'cyan');
  log(`  Manual renewal for ${TARGET_NAME}  (Stripe mode: ${stripeMode.toUpperCase()})`, 'cyan');
  log(`  Mode: ${CONFIRM ? 'LIVE — WILL CHARGE THE CARD' : 'DRY RUN — no charge'}`, CONFIRM ? 'yellow' : 'dim');
  log('════════════════════════════════════════════════════════════', 'cyan');

  // 1. Find the customer by phone (fall back to name)
  let { data: customers } = await supabase
    .from('users')
    .select('id, name, email, phone, stripe_customer_id_test, stripe_customer_id_live')
    .eq('phone', TARGET_PHONE);

  if (!customers || customers.length === 0) {
    ({ data: customers } = await supabase
      .from('users')
      .select('id, name, email, phone, stripe_customer_id_test, stripe_customer_id_live')
      .ilike('name', TARGET_NAME));
  }

  if (!customers || customers.length === 0) {
    log(`❌ Customer not found (phone ${TARGET_PHONE} / name ${TARGET_NAME})`, 'red');
    process.exit(1);
  }
  if (customers.length > 1) {
    log(`⚠️  Multiple customers matched — aborting for safety. Matches:`, 'yellow');
    customers.forEach((cust) => log(`   - ${cust.name} (${cust.id}) ${cust.phone} ${cust.email}`, 'dim'));
    process.exit(1);
  }

  const customer = customers[0];
  log(`\n👤 Customer: ${customer.name}  (${customer.id})`, 'reset');
  log(`   phone: ${customer.phone}   email: ${customer.email}`, 'dim');

  // 2. Find the monthly pass to renew — the one still flagged auto_renew=true
  const { data: monthlyPasses } = await supabase
    .from('purchases')
    .select('id, name, price, status, auto_renew, product_id, child_id, purchase_date, expiry_date, actual_expiry_date, next_renewal_date')
    .eq('customer_id', customer.id)
    .eq('type', 'monthly_pass')
    .order('expiry_date', { ascending: false });

  if (!monthlyPasses || monthlyPasses.length === 0) {
    log('❌ No monthly passes found for this customer', 'red');
    process.exit(1);
  }

  log(`\n🗓️  Monthly passes on file:`, 'reset');
  monthlyPasses.forEach((p) => {
    log(
      `   - ${p.name}  $${Number(p.price).toFixed(2)}  status=${p.status}  auto_renew=${p.auto_renew}  expires=${p.expiry_date?.slice(0, 10)}  (${p.id})`,
      'dim',
    );
  });

  const target = monthlyPasses.find((p) => p.auto_renew === true) || monthlyPasses[0];
  log(`\n🎯 Target pass: ${target.name} $${Number(target.price).toFixed(2)} (expired ${target.expiry_date?.slice(0, 10)})`, 'cyan');

  if (!target.product_id) {
    log('❌ Target pass has no product_id — cannot resolve session count. Aborting.', 'red');
    process.exit(1);
  }

  // 3. Find the default saved card for the current Stripe mode
  const { data: cards } = await supabase
    .from('saved_cards')
    .select('stripe_payment_method_id, is_default, last4, brand, stripe_mode')
    .eq('customer_id', customer.id)
    .eq('stripe_mode', stripeMode)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (!cards || cards.length === 0) {
    log(`❌ No saved card for this customer in ${stripeMode} mode — cannot charge.`, 'red');
    process.exit(1);
  }
  const card = cards[0];
  log(`\n💳 Card to charge: ${card.brand} •••• ${card.last4}${card.is_default ? ' (default)' : ''}`, 'reset');

  // 4. Resolve session count + duration from the passes table
  const { data: passRow } = await supabase
    .from('passes')
    .select('sessions_included, duration')
    .eq('id', target.product_id)
    .maybeSingle();

  const totalSessions = passRow?.sessions_included ?? 999;
  const durationDays = passRow?.duration ?? MONTHLY_DURATION_DAYS;

  // Fresh full month from today (pass already lapsed — no backdating)
  const now = new Date();
  const newExpiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const newRenewalDate = new Date(newExpiry.getTime() - RENEW_DAYS_BEFORE_EXPIRY * 24 * 60 * 60 * 1000);
  const amountInCents = Math.round(Number(target.price) * 100);

  log(`\n📋 Plan:`, 'reset');
  log(`   Charge:        $${(amountInCents / 100).toFixed(2)} to ${card.brand} ••${card.last4}`, 'dim');
  log(`   New pass:      ${target.name}  (${totalSessions === 999 ? 'unlimited' : totalSessions + ' sessions'})`, 'dim');
  log(`   Active until:  ${newExpiry.toISOString().slice(0, 10)}`, 'dim');
  log(`   Next renewal:  ${newRenewalDate.toISOString().slice(0, 10)}  (cron takes over)`, 'dim');

  if (!CONFIRM) {
    log(`\n✅ DRY RUN complete. No charge made. Re-run with --confirm to execute.`, 'green');
    return;
  }

  // 5. Charge the card off-session (idempotent per pass + expiry period)
  const stripeCustomerId =
    stripeMode === 'live' ? customer.stripe_customer_id_live : customer.stripe_customer_id_test;
  if (!stripeCustomerId) {
    log(`❌ Customer has no Stripe customer id for ${stripeMode} mode. Aborting.`, 'red');
    process.exit(1);
  }

  const periodKey = (target.expiry_date || now.toISOString()).slice(0, 10);
  const idempotencyKey = `autorenew_manual_${target.id}_${periodKey}`;

  log(`\n💳 Charging card...`, 'yellow');
  let paymentIntentId: string;
  try {
    const pi = await stripe.paymentIntents.create(
      {
        amount: amountInCents,
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: card.stripe_payment_method_id,
        description: `Manual auto-renewal: ${target.name}`,
        metadata: {
          customer_id: customer.id,
          renewed_from_purchase_id: target.id,
          product_id: target.product_id,
          purchase_type: 'monthly_pass',
          child_id: target.child_id || '',
          manual_backfill: 'true',
        },
        confirm: true,
        off_session: true,
      },
      { idempotencyKey },
    );

    if (pi.status !== 'succeeded') {
      log(`❌ Payment not completed. Status: ${pi.status}`, 'red');
      process.exit(1);
    }
    paymentIntentId = pi.id;
    log(`✅ Charge succeeded: ${paymentIntentId}`, 'green');
  } catch (err) {
    const e = err as { code?: string; message?: string };
    log(`❌ Charge failed: ${e.code || ''} ${e.message || err}`, 'red');
    process.exit(1);
  }

  // Guard: if a renewal for this PI already exists (script re-run), don't duplicate
  const { data: existing } = await supabase
    .from('purchases')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (existing) {
    log(`\nℹ️  A renewal pass already exists for this charge (${existing.id}). Nothing more to do.`, 'yellow');
    return;
  }

  // 6. Create the new active monthly pass
  const { data: newPass, error: insertError } = await supabase
    .from('purchases')
    .insert({
      customer_id: customer.id,
      child_id: target.child_id,
      type: 'monthly_pass',
      product_id: target.product_id,
      name: target.name,
      price: target.price,
      purchase_date: now.toISOString(),
      expiry_date: newExpiry.toISOString(),
      used_sessions: 0,
      total_sessions: totalSessions,
      status: 'active',
      stripe_payment_intent_id: paymentIntentId,
      auto_renew: true,
      next_renewal_date: newRenewalDate.toISOString(),
    })
    .select()
    .single();

  if (insertError || !newPass) {
    log(`\n⚠️  CHARGED ($${(amountInCents / 100).toFixed(2)}) but failed to create the pass!`, 'red');
    log(`    Payment intent: ${paymentIntentId}`, 'red');
    log(`    Re-run this script with --confirm — the charge is idempotent and the`, 'red');
    log(`    existing-charge guard will finish creating the pass.`, 'red');
    log(`    Error: ${insertError?.message}`, 'red');
    process.exit(1);
  }

  log(`✅ Created new active pass: ${newPass.id}`, 'green');

  // Copy any family-pass child links
  const { data: childLinks } = await supabase
    .from('purchase_children')
    .select('child_id')
    .eq('purchase_id', target.id);
  if (childLinks && childLinks.length > 0) {
    await supabase
      .from('purchase_children')
      .insert(childLinks.map((l) => ({ purchase_id: newPass.id, child_id: l.child_id })));
    log(`   Copied ${childLinks.length} family-pass child link(s)`, 'dim');
  }

  // 7. Turn off auto_renew on the old (expired) pass so it can't be reprocessed
  await supabase
    .from('purchases')
    .update({ auto_renew: false, next_renewal_date: null })
    .eq('id', target.id);
  log(`   Deactivated auto-renew on the old expired pass`, 'dim');

  log(`\n🎉 Done. ${customer.name} is renewed through ${newExpiry.toISOString().slice(0, 10)}.`, 'green');
  log(`   The daily auto-renew cron will handle her next renewal automatically.`, 'dim');
  log(`   (A receipt email is not sent by this script — send one manually if desired.)`, 'dim');
}

main().catch((err) => {
  log(`❌ Unexpected error: ${err}`, 'red');
  process.exit(1);
});
