/**
 * Party Packages Service Layer
 * CRUD operations for party packages with automatic Stripe sync
 */

import { createClient, createAdminClient } from '../supabase/server';
import { Database } from '../supabase/database.types';
import { getStripeClient } from '../stripe/client';
import { createProductWithPrice, updateStripeProduct, deleteStripeProduct } from '../stripe/products';
import { logger } from '../logger';

type PartyPackage = Database['public']['Tables']['party_packages']['Row'];
type PartyPackageInsert = Database['public']['Tables']['party_packages']['Insert'];
type PartyPackageUpdate = Database['public']['Tables']['party_packages']['Update'];

/**
 * Get party package by ID
 */
export async function getPartyPackage(id: string): Promise<PartyPackage | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('party_packages')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching party package:', error);
    throw error;
  }

  return data;
}

/**
 * Get all active party packages
 */
export async function getActivePartyPackages(): Promise<PartyPackage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('party_packages')
    .select('*')
    .eq('is_active', true)
    .order('base_price', { ascending: true });

  if (error) {
    console.error('Error fetching active party packages:', error);
    throw error;
  }

  return data;
}

/**
 * Get all party packages (staff only)
 */
export async function getAllPartyPackages(): Promise<PartyPackage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('party_packages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all party packages:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new party package with automatic Stripe sync
 */
export async function createPartyPackage(partyPackage: PartyPackageInsert): Promise<PartyPackage> {
  const supabase = createAdminClient();

  // First create in database
  const { data, error } = await supabase
    .from('party_packages')
    .insert(partyPackage)
    .select()
    .single();

  if (error) {
    console.error('Error creating party package:', error);
    throw error;
  }

  // Auto-sync to Stripe
  try {
    const stripeResult = await createProductWithPrice(
      {
        name: data.name,
        description: data.description || `${data.name} - Up to ${data.capacity} guests, ${data.duration} hours`,
        metadata: {
          type: 'party',
          local_id: data.id,
          capacity: String(data.capacity),
          duration: String(data.duration),
        },
      },
      {
        unit_amount: Math.round(data.base_price * 100),
        currency: 'usd',
      }
    );

    // Update with Stripe IDs
    const { data: updatedParty, error: updateError } = await supabase
      .from('party_packages')
      .update({
        stripe_product_id: stripeResult.product.id,
        stripe_price_id: stripeResult.price.id,
        stripe_purchase_link: stripeResult.paymentLink.url,
      })
      .eq('id', data.id)
      .select()
      .single();

    if (updateError) {
      logger.warn({ error: updateError, partyId: data.id }, '⚠️ Party created but failed to save Stripe IDs');
      return data;
    }

    logger.info({ partyId: data.id, stripeProductId: stripeResult.product.id }, '✅ Party created and synced to Stripe');
    return updatedParty;
  } catch (stripeError) {
    logger.warn({ error: stripeError, partyId: data.id }, '⚠️ Party created but Stripe sync failed');
    return data;
  }
}

/**
 * Update a party package with automatic Stripe sync
 */
export async function updatePartyPackage(id: string, updates: PartyPackageUpdate): Promise<PartyPackage> {
  const supabase = createAdminClient();

  // Get current party to check for Stripe ID
  const { data: currentParty } = await supabase
    .from('party_packages')
    .select('stripe_product_id, stripe_price_id')
    .eq('id', id)
    .single();

  // Update in database
  const { data, error } = await supabase
    .from('party_packages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating party package:', error);
    throw error;
  }

  // Sync updates to Stripe if product exists
  if (currentParty?.stripe_product_id) {
    try {
      await updateStripeProduct(currentParty.stripe_product_id, {
        name: data.name,
        description: data.description || undefined,
        metadata: {
          type: 'party',
          local_id: data.id,
          capacity: String(data.capacity),
          duration: String(data.duration),
        },
      });

      // If price changed, create new price
      if (updates.base_price !== undefined) {
        const stripe = await getStripeClient();
        const newPrice = await stripe.prices.create({
          product: currentParty.stripe_product_id,
          unit_amount: Math.round(data.base_price * 100),
          currency: 'usd',
        });

        if (currentParty.stripe_price_id) {
          await stripe.prices.update(currentParty.stripe_price_id, { active: false });
        }

        await supabase
          .from('party_packages')
          .update({ stripe_price_id: newPrice.id })
          .eq('id', id);

        data.stripe_price_id = newPrice.id;
      }

      logger.info({ partyId: id }, '✅ Party updated and synced to Stripe');
    } catch (stripeError) {
      logger.warn({ error: stripeError, partyId: id }, '⚠️ Party updated but Stripe sync failed');
    }
  }

  return data;
}

/**
 * Delete a party package (archives in Stripe)
 */
export async function deletePartyPackage(id: string): Promise<void> {
  const supabase = createAdminClient();

  // Get Stripe product ID before deleting
  const { data: party } = await supabase
    .from('party_packages')
    .select('stripe_product_id')
    .eq('id', id)
    .single();

  // Delete from database
  const { error } = await supabase
    .from('party_packages')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting party package:', error);
    throw error;
  }

  // Archive in Stripe
  if (party?.stripe_product_id) {
    try {
      await deleteStripeProduct(party.stripe_product_id);
      logger.info({ partyId: id, stripeProductId: party.stripe_product_id }, '✅ Party deleted and archived in Stripe');
    } catch (stripeError) {
      logger.warn({ error: stripeError, partyId: id }, '⚠️ Party deleted but Stripe archive failed');
    }
  }
}
