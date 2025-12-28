/**
 * Stripe Test to Live Migration Script
 *
 * This script migrates all products from Stripe test mode to live mode:
 * 1. Reads passes, parties, and products from Supabase
 * 2. Creates each in Stripe live mode (product + price + payment link)
 * 3. Updates the database with new live Stripe IDs
 *
 * PREREQUISITES:
 * - Set STRIPE_LIVE_SECRET_KEY in your environment
 * - Have your Supabase connection configured
 *
 * USAGE:
 *   npx tsx scripts/migrate-stripe-to-live.ts
 *
 * OPTIONS:
 *   --dry-run    Preview what would be created without making changes
 *   --passes     Only migrate passes
 *   --parties    Only migrate party packages
 *   --products   Only migrate food/retail products
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STRIPE_LIVE_SECRET_KEY = process.env.STRIPE_LIVE_SECRET_KEY!;

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const PASSES_ONLY = args.includes('--passes');
const PARTIES_ONLY = args.includes('--parties');
const PRODUCTS_ONLY = args.includes('--products');
const MIGRATE_ALL = !PASSES_ONLY && !PARTIES_ONLY && !PRODUCTS_ONLY;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Validate environment
function validateEnvironment() {
  const missing: string[] = [];

  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!STRIPE_LIVE_SECRET_KEY) missing.push('STRIPE_LIVE_SECRET_KEY');

  if (missing.length > 0) {
    logError('Missing required environment variables:');
    missing.forEach((v) => log(`  - ${v}`, 'red'));
    log('\nAdd STRIPE_LIVE_SECRET_KEY to your .env.local file:', 'yellow');
    log('  STRIPE_LIVE_SECRET_KEY=sk_live_...', 'dim');
    process.exit(1);
  }

  // Verify it's a live key
  if (!STRIPE_LIVE_SECRET_KEY.startsWith('sk_live_')) {
    logError('STRIPE_LIVE_SECRET_KEY must be a live mode key (starts with sk_live_)');
    logWarning('You provided a test key. This script is for migrating TO live mode.');
    process.exit(1);
  }

  logSuccess('Environment validated');
}

// Initialize clients
function initClients() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const stripe = new Stripe(STRIPE_LIVE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
    typescript: true,
  });

  return { supabase, stripe };
}

// Create product with price and payment link
async function createStripeProductWithPrice(
  stripe: Stripe,
  name: string,
  description: string,
  priceInCents: number,
  metadata: Record<string, string>
) {
  // Create product
  const product = await stripe.products.create({
    name,
    description,
    metadata,
  });

  // Create price
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: priceInCents,
    currency: 'usd',
  });

  // Create payment link
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
  });

  return { product, price, paymentLink };
}

// Migrate passes
async function migratePasses(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe
) {
  log('\n📋 Migrating Passes...', 'cyan');

  const { data: passes, error } = await supabase
    .from('passes')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    logError(`Failed to fetch passes: ${error.message}`);
    return { success: 0, failed: 0 };
  }

  if (!passes || passes.length === 0) {
    logWarning('No passes found to migrate');
    return { success: 0, failed: 0 };
  }

  log(`Found ${passes.length} passes to migrate`, 'dim');

  let success = 0;
  let failed = 0;

  for (const pass of passes) {
    try {
      log(`  → ${pass.name} ($${pass.price})`, 'dim');

      if (DRY_RUN) {
        logSuccess(`[DRY RUN] Would create: ${pass.name}`);
        success++;
        continue;
      }

      const { product, price, paymentLink } = await createStripeProductWithPrice(
        stripe,
        pass.name,
        pass.description || `${pass.name} - ${pass.category} pass`,
        Math.round(pass.price * 100),
        {
          type: 'pass',
          category: pass.category,
          local_id: pass.id,
          duration: String(pass.duration),
          sessions: String(pass.sessions_included),
          environment: 'live',
        }
      );

      // Update database with live Stripe IDs
      const { error: updateError } = await supabase
        .from('passes')
        .update({
          stripe_product_id: product.id,
          stripe_price_id: price.id,
          stripe_purchase_link: paymentLink.url,
        })
        .eq('id', pass.id);

      if (updateError) {
        logWarning(`Created in Stripe but failed to update DB: ${updateError.message}`);
        failed++;
      } else {
        logSuccess(`${pass.name} → ${product.id}`);
        success++;
      }
    } catch (err) {
      logError(`Failed to migrate ${pass.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      failed++;
    }
  }

  return { success, failed };
}

// Migrate party packages
async function migrateParties(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe
) {
  log('\n🎉 Migrating Party Packages...', 'cyan');

  const { data: parties, error } = await supabase
    .from('party_packages')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    logError(`Failed to fetch parties: ${error.message}`);
    return { success: 0, failed: 0 };
  }

  if (!parties || parties.length === 0) {
    logWarning('No party packages found to migrate');
    return { success: 0, failed: 0 };
  }

  log(`Found ${parties.length} party packages to migrate`, 'dim');

  let success = 0;
  let failed = 0;

  for (const party of parties) {
    try {
      log(`  → ${party.name} ($${party.base_price})`, 'dim');

      if (DRY_RUN) {
        logSuccess(`[DRY RUN] Would create: ${party.name}`);
        success++;
        continue;
      }

      const { product, price, paymentLink } = await createStripeProductWithPrice(
        stripe,
        party.name,
        party.description || `${party.name} - Up to ${party.capacity} guests`,
        Math.round(party.base_price * 100),
        {
          type: 'party',
          local_id: party.id,
          capacity: String(party.capacity),
          duration: String(party.duration),
          environment: 'live',
        }
      );

      // Update database with live Stripe IDs
      const { error: updateError } = await supabase
        .from('party_packages')
        .update({
          stripe_product_id: product.id,
          stripe_price_id: price.id,
          stripe_purchase_link: paymentLink.url,
        })
        .eq('id', party.id);

      if (updateError) {
        logWarning(`Created in Stripe but failed to update DB: ${updateError.message}`);
        failed++;
      } else {
        logSuccess(`${party.name} → ${product.id}`);
        success++;
      }
    } catch (err) {
      logError(`Failed to migrate ${party.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      failed++;
    }
  }

  return { success, failed };
}

// Migrate products (food/retail)
async function migrateProducts(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe
) {
  log('\n🛒 Migrating Products (Food/Retail)...', 'cyan');

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    logError(`Failed to fetch products: ${error.message}`);
    return { success: 0, failed: 0 };
  }

  if (!products || products.length === 0) {
    logWarning('No products found to migrate');
    return { success: 0, failed: 0 };
  }

  log(`Found ${products.length} products to migrate`, 'dim');

  let success = 0;
  let failed = 0;

  for (const product of products) {
    try {
      log(`  → ${product.name} ($${product.price})`, 'dim');

      if (DRY_RUN) {
        logSuccess(`[DRY RUN] Would create: ${product.name}`);
        success++;
        continue;
      }

      const { product: stripeProduct, price, paymentLink } = await createStripeProductWithPrice(
        stripe,
        product.name,
        product.description || product.name,
        Math.round(product.price * 100),
        {
          type: 'product',
          category: product.category,
          local_id: product.id,
          environment: 'live',
        }
      );

      // Update database with live Stripe IDs
      const { error: updateError } = await supabase
        .from('products')
        .update({
          stripe_product_id: stripeProduct.id,
          stripe_price_id: price.id,
          stripe_purchase_link: paymentLink.url,
        })
        .eq('id', product.id);

      if (updateError) {
        logWarning(`Created in Stripe but failed to update DB: ${updateError.message}`);
        failed++;
      } else {
        logSuccess(`${product.name} → ${stripeProduct.id}`);
        success++;
      }
    } catch (err) {
      logError(`Failed to migrate ${product.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      failed++;
    }
  }

  return { success, failed };
}

// Main migration function
async function main() {
  console.log('\n');
  log('🐝 BusyBees Stripe Migration: Test → Live', 'cyan');
  log('=========================================\n', 'cyan');

  if (DRY_RUN) {
    logWarning('DRY RUN MODE - No changes will be made\n');
  }

  // Validate environment
  validateEnvironment();

  // Initialize clients
  const { supabase, stripe } = initClients();

  // Verify Stripe connection
  try {
    const account = await stripe.accounts.retrieve();
    logSuccess(`Connected to Stripe account: ${account.business_profile?.name || account.id}`);

    if (account.charges_enabled) {
      logSuccess('Account is enabled for charges (live mode ready)');
    } else {
      logWarning('Account may not be fully set up for live charges');
    }
  } catch (err) {
    logError(`Failed to connect to Stripe: ${err instanceof Error ? err.message : 'Unknown error'}`);
    process.exit(1);
  }

  // Run migrations
  const results = {
    passes: { success: 0, failed: 0 },
    parties: { success: 0, failed: 0 },
    products: { success: 0, failed: 0 },
  };

  if (MIGRATE_ALL || PASSES_ONLY) {
    results.passes = await migratePasses(supabase, stripe);
  }

  if (MIGRATE_ALL || PARTIES_ONLY) {
    results.parties = await migrateParties(supabase, stripe);
  }

  if (MIGRATE_ALL || PRODUCTS_ONLY) {
    results.products = await migrateProducts(supabase, stripe);
  }

  // Summary
  console.log('\n');
  log('📊 Migration Summary', 'cyan');
  log('====================\n', 'cyan');

  const totalSuccess =
    results.passes.success + results.parties.success + results.products.success;
  const totalFailed =
    results.passes.failed + results.parties.failed + results.products.failed;

  if (MIGRATE_ALL || PASSES_ONLY) {
    log(`Passes:   ${results.passes.success} succeeded, ${results.passes.failed} failed`);
  }
  if (MIGRATE_ALL || PARTIES_ONLY) {
    log(`Parties:  ${results.parties.success} succeeded, ${results.parties.failed} failed`);
  }
  if (MIGRATE_ALL || PRODUCTS_ONLY) {
    log(`Products: ${results.products.success} succeeded, ${results.products.failed} failed`);
  }

  console.log('\n');

  if (totalFailed === 0 && totalSuccess > 0) {
    logSuccess(`All ${totalSuccess} items migrated successfully! 🎉`);
  } else if (totalSuccess > 0) {
    logWarning(`${totalSuccess} items migrated, ${totalFailed} failed`);
  } else {
    logError('No items were migrated');
  }

  if (DRY_RUN) {
    log('\nTo perform the actual migration, run without --dry-run', 'yellow');
  } else {
    log('\n📝 Next Steps:', 'cyan');
    log('1. Update your settings with live Stripe keys');
    log('2. Test a payment in live mode');
    log('3. Monitor your Stripe Dashboard for the new products');
  }

  console.log('\n');
}

// Run the script
main().catch((err) => {
  logError(`Migration failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  process.exit(1);
});

