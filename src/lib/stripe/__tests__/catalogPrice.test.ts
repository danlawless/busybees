import { describe, expect, it } from 'vitest';
import {
  assertChildrenOwned,
  browserMetadata,
  CatalogPriceError,
  PRICE_CHANGED_ERROR,
  purchaseTypeForCategory,
  resolveCatalogItem,
  sameAmount,
} from '@/lib/stripe/catalogPrice';
import type { createAdminClient } from '@/lib/supabase/server';

type Db = ReturnType<typeof createAdminClient>;
type Row = Record<string, unknown>;

/** Just enough of the Supabase query builder for these lookups. */
function fakeDb(tables: Record<string, Row[]>): Db {
  return {
    from(table: string) {
      let rows = tables[table] ?? [];
      const q = {
        select: () => q,
        eq: (col: string, val: unknown) => ((rows = rows.filter((r) => r[col] === val)), q),
        in: (col: string, vals: unknown[]) => ((rows = rows.filter((r) => vals.includes(r[col]))), q),
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve({ data: rows, error: null }),
      };
      return q;
    },
  } as unknown as Db;
}

const db = fakeDb({
  passes: [
    { id: 'day', name: 'Day Pass', description: 'One visit', price: 20, category: 'day', is_active: true },
    { id: 'month', name: 'Monthly', description: 'Unlimited', price: 99, category: 'monthly', is_active: true },
    { id: 'old', name: 'Old Pass', description: '', price: 15, category: 'day', is_active: false },
  ],
  party_packages: [
    { id: 'worker', name: 'Worker Bee', description: 'Party', base_price: 450, is_active: true },
  ],
  children: [
    { id: 'kid-a', customer_id: 'me' },
    { id: 'kid-b', customer_id: 'me' },
    { id: 'kid-x', customer_id: 'someone-else' },
  ],
});

const refusal = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    if (e instanceof CatalogPriceError) return { status: e.status, message: e.message };
    throw e;
  }
  throw new Error('expected a refusal');
};

describe('resolveCatalogItem', () => {
  it('prices a pass from the passes table, with its own name', async () => {
    expect(await resolveCatalogItem(db, 'day', 'day_pass', 20)).toEqual({
      name: 'Day Pass', description: 'One visit', price: 20, purchaseType: 'day_pass',
    });
  });

  it('prices a party package from party_packages', async () => {
    const item = await resolveCatalogItem(db, 'worker', 'party_package', 450);
    expect(item.price).toBe(450);
    expect(item.purchaseType).toBe('party_package');
  });

  it('refuses a shown price that is not the real one', async () => {
    expect(await refusal(resolveCatalogItem(db, 'month', 'monthly_pass', 0.01))).toEqual({
      status: 409, message: PRICE_CHANGED_ERROR,
    });
  });

  it('refuses a pass sold as a cheaper type than it is', async () => {
    expect((await refusal(resolveCatalogItem(db, 'month', 'day_pass', 99))).status).toBe(400);
  });

  it('refuses unknown and inactive products', async () => {
    expect((await refusal(resolveCatalogItem(db, 'nope', 'day_pass', 20))).status).toBe(400);
    expect((await refusal(resolveCatalogItem(db, 'old', 'day_pass', 15))).status).toBe(400);
    expect((await refusal(resolveCatalogItem(db, 'nope', 'party_package', 450))).status).toBe(400);
  });
});

describe('assertChildrenOwned', () => {
  it('accepts the account’s own children, repeated or not', async () => {
    await expect(assertChildrenOwned(db, 'me', ['kid-a', 'kid-b', 'kid-a'])).resolves.toBeUndefined();
    await expect(assertChildrenOwned(db, 'me', [])).resolves.toBeUndefined();
  });

  it('refuses a child from another account', async () => {
    expect((await refusal(assertChildrenOwned(db, 'me', ['kid-a', 'kid-x']))).status).toBe(400);
  });
});

describe('browserMetadata', () => {
  it('keeps only the Stripe price/product ids, never server keys', () => {
    expect(
      browserMetadata({ stripe_price_id: 'price_1', customer_id: 'victim', product_id: 'month', stripe_product_id: 5 })
    ).toEqual({ stripe_price_id: 'price_1' });
    expect(browserMetadata(null)).toEqual({});
  });
});

describe('helpers', () => {
  it('maps pass categories to purchase types', () => {
    expect(purchaseTypeForCategory('weekly')).toBe('weekly_pass');
    expect(purchaseTypeForCategory('snack')).toBeNull();
  });

  it('treats amounts within half a cent as equal', () => {
    expect(sameAmount(20, 20.004)).toBe(true);
    expect(sameAmount(20, 19.99)).toBe(false);
  });
});
