/**
 * Stripe Product Management Functions
 * Create, update, and delete products in Stripe
 */

import { getStripeClient } from './client';
import Stripe from 'stripe';

export interface CreateProductData {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
  images?: string[];
}

export interface CreatePriceData {
  product: string; // Product ID
  unit_amount: number; // Amount in cents
  currency?: string;
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count?: number;
  };
  metadata?: Record<string, string>;
}

/**
 * Create a product in Stripe
 */
export async function createStripeProduct(data: CreateProductData): Promise<Stripe.Product> {
  const stripe = await getStripeClient();
  return await stripe.products.create({
    name: data.name,
    description: data.description,
    metadata: data.metadata || {},
    images: data.images || [],
  });
}

/**
 * Update a product in Stripe
 */
export async function updateStripeProduct(
  productId: string,
  data: Partial<CreateProductData>
): Promise<Stripe.Product> {
  const stripe = await getStripeClient();
  return await stripe.products.update(productId, {
    name: data.name,
    description: data.description,
    metadata: data.metadata,
    images: data.images,
  });
}

/**
 * Delete (archive) a product in Stripe
 */
export async function deleteStripeProduct(productId: string): Promise<Stripe.Product> {
  const stripe = await getStripeClient();
  return await stripe.products.update(productId, {
    active: false,
  });
}

/**
 * Get a product from Stripe
 */
export async function getStripeProduct(productId: string): Promise<Stripe.Product> {
  const stripe = await getStripeClient();
  return await stripe.products.retrieve(productId);
}

/**
 * List all products from Stripe
 */
export async function listStripeProducts(
  active?: boolean
): Promise<Stripe.ApiList<Stripe.Product>> {
  const stripe = await getStripeClient();
  return await stripe.products.list({
    active,
    limit: 100,
  });
}

/**
 * Create a price for a product in Stripe
 */
export async function createStripePrice(data: CreatePriceData): Promise<Stripe.Price> {
  const stripe = await getStripeClient();
  return await stripe.prices.create({
    product: data.product,
    unit_amount: data.unit_amount,
    currency: data.currency || 'usd',
    recurring: data.recurring,
    metadata: data.metadata || {},
  });
}

/**
 * Update a price in Stripe (limited fields)
 */
export async function updateStripePrice(
  priceId: string,
  metadata?: Record<string, string>
): Promise<Stripe.Price> {
  const stripe = await getStripeClient();
  return await stripe.prices.update(priceId, {
    metadata: metadata || {},
  });
}

/**
 * Archive a price in Stripe
 */
export async function archiveStripePrice(priceId: string): Promise<Stripe.Price> {
  const stripe = await getStripeClient();
  return await stripe.prices.update(priceId, {
    active: false,
  });
}

/**
 * List prices for a product
 */
export async function listStripePrices(
  productId?: string
): Promise<Stripe.ApiList<Stripe.Price>> {
  const stripe = await getStripeClient();
  return await stripe.prices.list({
    product: productId,
    limit: 100,
  });
}

/**
 * Generate a Stripe Payment Link for a price
 */
export async function createPaymentLink(
  priceId: string,
  quantity: number = 1
): Promise<Stripe.PaymentLink> {
  const stripe = await getStripeClient();
  return await stripe.paymentLinks.create({
    line_items: [
      {
        price: priceId,
        quantity,
      },
    ],
  });
}

/**
 * Create product with price in one go
 */
export async function createProductWithPrice(
  productData: CreateProductData,
  priceData: Omit<CreatePriceData, 'product'>
): Promise<{ product: Stripe.Product; price: Stripe.Price; paymentLink: Stripe.PaymentLink }> {
  // Create product
  const product = await createStripeProduct(productData);

  // Create price
  const price = await createStripePrice({
    ...priceData,
    product: product.id,
  });

  // Create payment link
  const paymentLink = await createPaymentLink(price.id);

  return { product, price, paymentLink };
}

