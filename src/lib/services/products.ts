/**
 * Products Service Layer
 * CRUD operations for food/beverage/retail products with automatic Stripe sync
 */

import { createClient } from '../supabase/server';
import { Database } from '../supabase/database.types';
import { getStripeClient } from '../stripe/client';
import { createProductWithPrice, updateStripeProduct, deleteStripeProduct } from '../stripe/products';
import { logger } from '../logger';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

/**
 * Get product by ID
 */
export async function getProduct(id: string): Promise<Product | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching product:', error);
    throw error;
  }

  return data;
}

/**
 * Get all active products
 */
export async function getActiveProducts(): Promise<Product[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .eq('available', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching active products:', error);
    throw error;
  }

  return data;
}

/**
 * Get all products (staff only)
 */
export async function getAllProducts(): Promise<Product[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all products:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new product with automatic Stripe sync
 */
export async function createProduct(product: ProductInsert): Promise<Product> {
  const supabase = await createClient();

  // First create in database
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) {
    console.error('Error creating product:', error);
    throw error;
  }

  // Auto-sync to Stripe
  try {
    const stripeResult = await createProductWithPrice(
      {
        name: data.name,
        description: data.description || data.name,
        metadata: {
          type: 'product',
          category: data.category,
          local_id: data.id,
        },
      },
      {
        unit_amount: Math.round(data.price * 100),
        currency: 'usd',
      }
    );

    // Update with Stripe IDs
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({
        stripe_product_id: stripeResult.product.id,
        stripe_price_id: stripeResult.price.id,
        stripe_purchase_link: stripeResult.paymentLink.url,
      })
      .eq('id', data.id)
      .select()
      .single();

    if (updateError) {
      logger.warn({ error: updateError, productId: data.id }, '⚠️ Product created but failed to save Stripe IDs');
      return data;
    }

    logger.info({ productId: data.id, stripeProductId: stripeResult.product.id }, '✅ Product created and synced to Stripe');
    return updatedProduct;
  } catch (stripeError) {
    logger.warn({ error: stripeError, productId: data.id }, '⚠️ Product created but Stripe sync failed');
    return data;
  }
}

/**
 * Update a product with automatic Stripe sync
 */
export async function updateProduct(id: string, updates: ProductUpdate): Promise<Product> {
  const supabase = await createClient();

  // Get current product to check for Stripe ID
  const { data: currentProduct } = await supabase
    .from('products')
    .select('stripe_product_id, stripe_price_id')
    .eq('id', id)
    .single();

  // Update in database
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating product:', error);
    throw error;
  }

  // Sync updates to Stripe if product exists
  if (currentProduct?.stripe_product_id) {
    try {
      await updateStripeProduct(currentProduct.stripe_product_id, {
        name: data.name,
        description: data.description || undefined,
        metadata: {
          type: 'product',
          category: data.category,
          local_id: data.id,
        },
      });

      // If price changed, create new price
      if (updates.price !== undefined) {
        const stripe = await getStripeClient();
        const newPrice = await stripe.prices.create({
          product: currentProduct.stripe_product_id,
          unit_amount: Math.round(data.price * 100),
          currency: 'usd',
        });

        if (currentProduct.stripe_price_id) {
          await stripe.prices.update(currentProduct.stripe_price_id, { active: false });
        }

        await supabase
          .from('products')
          .update({ stripe_price_id: newPrice.id })
          .eq('id', id);

        data.stripe_price_id = newPrice.id;
      }

      logger.info({ productId: id }, '✅ Product updated and synced to Stripe');
    } catch (stripeError) {
      logger.warn({ error: stripeError, productId: id }, '⚠️ Product updated but Stripe sync failed');
    }
  }

  return data;
}

/**
 * Delete a product (archives in Stripe)
 */
export async function deleteProduct(id: string): Promise<void> {
  const supabase = await createClient();

  // Get Stripe product ID before deleting
  const { data: product } = await supabase
    .from('products')
    .select('stripe_product_id')
    .eq('id', id)
    .single();

  // Delete from database
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting product:', error);
    throw error;
  }

  // Archive in Stripe
  if (product?.stripe_product_id) {
    try {
      await deleteStripeProduct(product.stripe_product_id);
      logger.info({ productId: id, stripeProductId: product.stripe_product_id }, '✅ Product deleted and archived in Stripe');
    } catch (stripeError) {
      logger.warn({ error: stripeError, productId: id }, '⚠️ Product deleted but Stripe archive failed');
    }
  }
}
