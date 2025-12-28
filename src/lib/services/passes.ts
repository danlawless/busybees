/**
 * Passes Service Layer
 * CRUD operations for pass products with automatic Stripe sync
 */

import { createClient, createAdminClient } from '../supabase/server';
import { Database } from '../supabase/database.types';
import { getStripeClient } from '../stripe/client';
import { createProductWithPrice, updateStripeProduct, deleteStripeProduct } from '../stripe/products';
import { logger } from '../logger';

type Pass = Database['public']['Tables']['passes']['Row'];
type PassInsert = Database['public']['Tables']['passes']['Insert'];
type PassUpdate = Database['public']['Tables']['passes']['Update'];

/**
 * Get pass by ID
 */
export async function getPass(id: string): Promise<Pass | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('passes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching pass:', error);
    throw error;
  }

  return data;
}

/**
 * Get all active passes
 */
export async function getActivePasses(): Promise<Pass[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('passes')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('price', { ascending: true });

  if (error) {
    console.error('Error fetching active passes:', error);
    throw error;
  }

  return data;
}

/**
 * Get all passes (staff only)
 */
export async function getAllPasses(): Promise<Pass[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('passes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all passes:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new pass with automatic Stripe sync
 */
export async function createPass(pass: PassInsert): Promise<Pass> {
  const supabase = createAdminClient();

  // First create in database
  const { data, error } = await supabase
    .from('passes')
    .insert(pass)
    .select()
    .single();

  if (error) {
    console.error('Error creating pass:', error);
    throw error;
  }

  // Auto-sync to Stripe
  try {
    const stripeResult = await createProductWithPrice(
      {
        name: data.name,
        description: data.description || `${data.name} - ${data.category} pass`,
        metadata: {
          type: 'pass',
          category: data.category,
          local_id: data.id,
          duration: String(data.duration),
          sessions: String(data.sessions_included),
        },
      },
      {
        unit_amount: Math.round(data.price * 100),
        currency: 'usd',
      }
    );

    // Update with Stripe IDs
    const { data: updatedPass, error: updateError } = await supabase
      .from('passes')
      .update({
        stripe_product_id: stripeResult.product.id,
        stripe_price_id: stripeResult.price.id,
        stripe_purchase_link: stripeResult.paymentLink.url,
      })
      .eq('id', data.id)
      .select()
      .single();

    if (updateError) {
      logger.warn({ error: updateError, passId: data.id }, '⚠️ Pass created but failed to save Stripe IDs');
      return data;
    }

    logger.info({ passId: data.id, stripeProductId: stripeResult.product.id }, '✅ Pass created and synced to Stripe');
    return updatedPass;
  } catch (stripeError) {
    logger.warn({ error: stripeError, passId: data.id }, '⚠️ Pass created but Stripe sync failed');
    return data; // Return the pass even if Stripe sync fails
  }
}

/**
 * Update a pass with automatic Stripe sync
 */
export async function updatePass(id: string, updates: PassUpdate): Promise<Pass> {
  const supabase = createAdminClient();

  // First get the current pass to check for Stripe ID
  const { data: currentPass } = await supabase
    .from('passes')
    .select('stripe_product_id, stripe_price_id')
    .eq('id', id)
    .single();

  // Update in database
  const { data, error } = await supabase
    .from('passes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating pass:', error);
    throw error;
  }

  // Sync updates to Stripe if product exists
  if (currentPass?.stripe_product_id) {
    try {
      await updateStripeProduct(currentPass.stripe_product_id, {
        name: data.name,
        description: data.description || undefined,
        metadata: {
          type: 'pass',
          category: data.category,
          local_id: data.id,
          duration: String(data.duration),
          sessions: String(data.sessions_included),
        },
      });

      // If price changed, create new price (Stripe prices are immutable)
      if (updates.price !== undefined) {
        const stripe = await getStripeClient();
        const newPrice = await stripe.prices.create({
          product: currentPass.stripe_product_id,
          unit_amount: Math.round(data.price * 100),
          currency: 'usd',
        });

        // Deactivate old price
        if (currentPass.stripe_price_id) {
          await stripe.prices.update(currentPass.stripe_price_id, { active: false });
        }

        // Update with new price ID
        await supabase
          .from('passes')
          .update({ stripe_price_id: newPrice.id })
          .eq('id', id);

        data.stripe_price_id = newPrice.id;
      }

      logger.info({ passId: id }, '✅ Pass updated and synced to Stripe');
    } catch (stripeError) {
      logger.warn({ error: stripeError, passId: id }, '⚠️ Pass updated but Stripe sync failed');
    }
  }

  return data;
}

/**
 * Delete a pass (archives in Stripe)
 */
export async function deletePass(id: string): Promise<void> {
  const supabase = createAdminClient();

  // Get Stripe product ID before deleting
  const { data: pass } = await supabase
    .from('passes')
    .select('stripe_product_id')
    .eq('id', id)
    .single();

  // Delete from database
  const { error } = await supabase
    .from('passes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting pass:', error);
    throw error;
  }

  // Archive in Stripe (don't delete - keep for historical records)
  if (pass?.stripe_product_id) {
    try {
      await deleteStripeProduct(pass.stripe_product_id);
      logger.info({ passId: id, stripeProductId: pass.stripe_product_id }, '✅ Pass deleted and archived in Stripe');
    } catch (stripeError) {
      logger.warn({ error: stripeError, passId: id }, '⚠️ Pass deleted but Stripe archive failed');
    }
  }
}

