/**
 * What a customer-facing payment is allowed to charge.
 *
 * The browser says which product it wants and the price it showed; the server
 * decides the price. Passes are priced from the `passes` table and party
 * packages from `party_packages` -- the two stores My Account reads -- so a
 * request can never name its own amount. A shown price that no longer matches
 * is refused rather than silently charged at a different figure.
 */

import type { createAdminClient } from '@/lib/supabase/server';

type Db = ReturnType<typeof createAdminClient>;

export type CustomerPurchaseType = 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package';

export interface CatalogItem {
  name: string;
  description: string;
  price: number;
  purchaseType: CustomerPurchaseType;
}

/** A request the route must refuse, with the status and message to send back. */
export class CatalogPriceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'CatalogPriceError';
  }
}

export const PRICE_CHANGED_ERROR =
  'This price has changed since the page loaded. Please refresh and try again.';

const TYPE_FOR_CATEGORY: Record<'day' | 'weekly' | 'monthly', CustomerPurchaseType> = {
  day: 'day_pass',
  weekly: 'weekly_pass',
  monthly: 'monthly_pass',
};

export function purchaseTypeForCategory(category: string): CustomerPurchaseType | null {
  return TYPE_FOR_CATEGORY[category as keyof typeof TYPE_FOR_CATEGORY] ?? null;
}

/** Within half a cent: the two figures are the same price. */
export function sameAmount(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

/**
 * The only metadata a browser may add to a PaymentIntent. Everything else
 * (customer, product, child, amounts) is written by the server, and the
 * webhook trusts those keys, so the browser must never be able to set them.
 */
export function browserMetadata(metadata: unknown): Record<string, string> {
  const allowed = ['stripe_price_id', 'stripe_product_id'] as const;
  const out: Record<string, string> = {};
  if (metadata && typeof metadata === 'object') {
    for (const key of allowed) {
      const value = (metadata as Record<string, unknown>)[key];
      if (typeof value === 'string') out[key] = value;
    }
  }
  return out;
}

/**
 * The product as the catalogue has it. Throws CatalogPriceError for an unknown
 * or inactive product, a type that does not match it, or a shown price that
 * differs from the real one.
 */
export async function resolveCatalogItem(
  db: Db,
  productId: string,
  requestedType: string,
  shownPrice: number
): Promise<CatalogItem> {
  let item: CatalogItem;

  if (requestedType === 'party_package') {
    const { data, error } = await db
      .from('party_packages')
      .select('name, description, base_price, is_active')
      .eq('id', productId)
      .maybeSingle();
    if (error) throw error;
    if (!data || !data.is_active) throw new CatalogPriceError(400, 'This party package is not available.');
    item = { name: data.name, description: data.description, price: Number(data.base_price), purchaseType: 'party_package' };
  } else {
    const { data, error } = await db
      .from('passes')
      .select('name, description, price, category, is_active')
      .eq('id', productId)
      .maybeSingle();
    if (error) throw error;
    if (!data || !data.is_active) throw new CatalogPriceError(400, 'This pass is not available.');
    const purchaseType = purchaseTypeForCategory(data.category);
    if (!purchaseType || purchaseType !== requestedType) {
      throw new CatalogPriceError(400, 'This pass does not match the purchase type requested.');
    }
    item = { name: data.name, description: data.description, price: Number(data.price), purchaseType };
  }

  if (!Number.isFinite(item.price) || item.price <= 0) {
    throw new CatalogPriceError(400, 'This product has no price set.');
  }
  if (!sameAmount(shownPrice, item.price)) {
    throw new CatalogPriceError(409, PRICE_CHANGED_ERROR);
  }
  return item;
}

/** Every named child must belong to the paying account. */
export async function assertChildrenOwned(db: Db, customerId: string, childIds: string[]): Promise<void> {
  const unique = [...new Set(childIds)];
  if (unique.length === 0) return;
  const { data, error } = await db
    .from('children')
    .select('id')
    .eq('customer_id', customerId)
    .in('id', unique);
  if (error) throw error;
  if ((data ?? []).length !== unique.length) {
    throw new CatalogPriceError(400, 'One of the children named is not on this account.');
  }
}
