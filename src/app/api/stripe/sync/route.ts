/**
 * API Route: Stripe Product Sync
 * GET - Check sync status (compare local products with Stripe)
 * POST - Sync all products to Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';
import { createProductWithPrice, listStripeProducts } from '@/lib/stripe/products';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';

interface SyncResult {
  passes: { total: number; synced: number; errors: string[] };
  parties: { total: number; synced: number; errors: string[] };
  products: { total: number; synced: number; errors: string[] };
}

// Check sync status
export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch local products
    const [passesResult, partiesResult, productsResult] = await Promise.all([
      supabase.from('passes').select('id, name, price, stripe_product_id, stripe_price_id, is_active'),
      supabase.from('party_packages').select('id, name, base_price, stripe_product_id, stripe_price_id, is_active'),
      supabase.from('products').select('id, name, price, stripe_product_id, stripe_price_id, is_active'),
    ]);

    const passes = passesResult.data || [];
    const parties = partiesResult.data || [];
    const products = productsResult.data || [];

    // Fetch Stripe products
    let stripeProducts: Stripe.Product[] = [];
    try {
      const stripeResult = await listStripeProducts(true);
      stripeProducts = stripeResult.data;
    } catch (error) {
      logger.warn({ error }, 'Could not fetch Stripe products');
    }

    const stripeProductIds = new Set(stripeProducts.map(p => p.id));

    // Calculate sync status
    const passesSynced = passes.filter(p => p.stripe_product_id && stripeProductIds.has(p.stripe_product_id));
    const passesUnsynced = passes.filter(p => !p.stripe_product_id);

    const partiesSynced = parties.filter(p => p.stripe_product_id && stripeProductIds.has(p.stripe_product_id));
    const partiesUnsynced = parties.filter(p => !p.stripe_product_id);

    const productsSynced = products.filter(p => p.stripe_product_id && stripeProductIds.has(p.stripe_product_id));
    const productsUnsynced = products.filter(p => !p.stripe_product_id);

    return NextResponse.json({
      status: {
        passes: {
          total: passes.length,
          synced: passesSynced.length,
          unsynced: passesUnsynced.length,
          unsyncedItems: passesUnsynced.map(p => ({ id: p.id, name: p.name, price: p.price })),
        },
        parties: {
          total: parties.length,
          synced: partiesSynced.length,
          unsynced: partiesUnsynced.length,
          unsyncedItems: partiesUnsynced.map(p => ({ id: p.id, name: p.name, price: p.base_price })),
        },
        products: {
          total: products.length,
          synced: productsSynced.length,
          unsynced: productsUnsynced.length,
          unsyncedItems: productsUnsynced.map(p => ({ id: p.id, name: p.name, price: p.price })),
        },
        stripeProducts: stripeProducts.length,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error checking sync status');
    return NextResponse.json(
      { error: 'Failed to check sync status', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// Sync all products to Stripe
export async function POST(request: NextRequest) {
  try {
    // Check for staff PIN header (for POS staff mode)
    const staffPin = request.headers.get('x-staff-pin');
    const isStaffMode = staffPin === '1234'; // Same PIN as POS staff mode

    if (!isStaffMode) {
      // Verify admin access via Supabase auth
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userData || userData.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    logger.info({ staffMode: isStaffMode }, '🔐 Stripe sync authorized');
    const adminSupabase = createAdminClient();
    const result: SyncResult = {
      passes: { total: 0, synced: 0, errors: [] },
      parties: { total: 0, synced: 0, errors: [] },
      products: { total: 0, synced: 0, errors: [] },
    };

    // Sync passes
    logger.info({}, '🔄 Starting pass sync to Stripe');
    const { data: passes } = await adminSupabase
      .from('passes')
      .select('*')
      .is('stripe_product_id', null)
      .eq('is_active', true);

    if (passes) {
      result.passes.total = passes.length;
      for (const pass of passes) {
        try {
          const stripeResult = await createProductWithPrice(
            {
              name: pass.name,
              description: pass.description || `${pass.name} - ${pass.category} pass`,
              metadata: {
                type: 'pass',
                category: pass.category,
                local_id: pass.id,
                duration: String(pass.duration),
                sessions: String(pass.sessions_included),
              },
            },
            {
              unit_amount: Math.round(pass.price * 100),
              currency: 'usd',
            }
          );

          // Update local record with Stripe IDs
          await adminSupabase
            .from('passes')
            .update({
              stripe_product_id: stripeResult.product.id,
              stripe_price_id: stripeResult.price.id,
              stripe_purchase_link: stripeResult.paymentLink.url,
            })
            .eq('id', pass.id);

          result.passes.synced++;
          logger.info({ passId: pass.id, stripeProductId: stripeResult.product.id }, '✅ Pass synced');
        } catch (error) {
          const msg = `Failed to sync pass "${pass.name}": ${error instanceof Error ? error.message : 'Unknown'}`;
          result.passes.errors.push(msg);
          logger.error({ error, passId: pass.id }, '❌ Failed to sync pass');
        }
      }
    }

    // Sync party packages
    logger.info({}, '🔄 Starting party package sync to Stripe');
    const { data: parties } = await adminSupabase
      .from('party_packages')
      .select('*')
      .is('stripe_product_id', null)
      .eq('is_active', true);

    if (parties) {
      result.parties.total = parties.length;
      for (const party of parties) {
        try {
          const stripeResult = await createProductWithPrice(
            {
              name: party.name,
              description: party.description || `${party.name} - Up to ${party.capacity} guests, ${party.duration} hours`,
              metadata: {
                type: 'party',
                local_id: party.id,
                capacity: String(party.capacity),
                duration: String(party.duration),
              },
            },
            {
              unit_amount: Math.round(party.base_price * 100),
              currency: 'usd',
            }
          );

          // Update local record with Stripe IDs
          await adminSupabase
            .from('party_packages')
            .update({
              stripe_product_id: stripeResult.product.id,
              stripe_price_id: stripeResult.price.id,
              stripe_purchase_link: stripeResult.paymentLink.url,
            })
            .eq('id', party.id);

          result.parties.synced++;
          logger.info({ partyId: party.id, stripeProductId: stripeResult.product.id }, '✅ Party synced');
        } catch (error) {
          const msg = `Failed to sync party "${party.name}": ${error instanceof Error ? error.message : 'Unknown'}`;
          result.parties.errors.push(msg);
          logger.error({ error, partyId: party.id }, '❌ Failed to sync party');
        }
      }
    }

    // Sync products (food/beverage/retail)
    logger.info({}, '🔄 Starting product sync to Stripe');
    const { data: products } = await adminSupabase
      .from('products')
      .select('*')
      .is('stripe_product_id', null)
      .eq('is_active', true);

    if (products) {
      result.products.total = products.length;
      for (const product of products) {
        try {
          const stripeResult = await createProductWithPrice(
            {
              name: product.name,
              description: product.description || product.name,
              metadata: {
                type: 'product',
                category: product.category,
                local_id: product.id,
              },
            },
            {
              unit_amount: Math.round(product.price * 100),
              currency: 'usd',
            }
          );

          // Update local record with Stripe IDs
          await adminSupabase
            .from('products')
            .update({
              stripe_product_id: stripeResult.product.id,
              stripe_price_id: stripeResult.price.id,
              stripe_purchase_link: stripeResult.paymentLink.url,
            })
            .eq('id', product.id);

          result.products.synced++;
          logger.info({ productId: product.id, stripeProductId: stripeResult.product.id }, '✅ Product synced');
        } catch (error) {
          const msg = `Failed to sync product "${product.name}": ${error instanceof Error ? error.message : 'Unknown'}`;
          result.products.errors.push(msg);
          logger.error({ error, productId: product.id }, '❌ Failed to sync product');
        }
      }
    }

    const totalSynced = result.passes.synced + result.parties.synced + result.products.synced;
    const totalErrors = result.passes.errors.length + result.parties.errors.length + result.products.errors.length;

    logger.info({ totalSynced, totalErrors }, '🎉 Stripe sync completed');

    return NextResponse.json({
      success: true,
      message: `Synced ${totalSynced} products to Stripe`,
      result,
    });
  } catch (error) {
    logger.error({ error }, 'Error syncing to Stripe');
    return NextResponse.json(
      { error: 'Failed to sync products', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

