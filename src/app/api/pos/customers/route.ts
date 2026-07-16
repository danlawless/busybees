/**
 * API Route: POS Customers
 * GET - List all customers with children and active sessions for POS admin panel
 *
 * Uses admin client (service role) to bypass RLS since POS staff
 * authentication is PIN-based rather than Supabase session-based.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { Database } from '@/lib/supabase/database.types';

/**
 * Fetch rows in chunks to avoid Supabase/PostgREST URL length limits.
 */
async function chunkedIn<T>(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  column: string,
  ids: string[],
  options?: { select?: string; orderBy?: string; orderAsc?: boolean; isNull?: string },
): Promise<T[]> {
  const CHUNK_SIZE = 100;
  const results: T[] = [];

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    let query = supabase.from(table).select(options?.select ?? '*').in(column, chunk);

    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderAsc ?? false });
    }
    if (options?.isNull) {
      query = query.is(options.isNull, null);
    }

    const { data, error } = await query;
    if (error) {
      logger.warn({ error, table, chunk: i / CHUNK_SIZE }, `Failed to fetch ${table} chunk`);
    }
    if (data) {
      results.push(...(data as T[]));
    }
  }

  return results;
}

// Use database types directly for consistency
type DbUser = Database['public']['Tables']['users']['Row'];
type DbChild = Database['public']['Tables']['children']['Row'];
type DbSession = Database['public']['Tables']['sessions']['Row'];
type DbPurchase = Database['public']['Tables']['purchases']['Row'];

interface FormattedChild {
  id: string;
  name: string;
  birthdate: string;
  waiver_signed: boolean;
  waiver_signed_date: string | null;
  created_at: string;
}

interface FormattedSession {
  id: string;
  customerId: string;
  purchaseId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  autoCheckoutTime: string;
}

interface FormattedPurchase {
  id: string;
  type: string;
  name: string;
  price: number;
  purchaseDate: string;
  expiryDate: string | null;
  firstUseDate: string | null;
  actualExpiryDate: string | null;
  usedSessions: number;
  totalSessions: number;
  status: string;
  autoRenew: boolean;
  childId: string | null; // Direct single-child link (needed to resolve check-in child names)
  childIds: string[]; // For family passes: all children covered by this purchase
  giftCardAmountUsed: number; // Portion of price paid from gift-card/account credit (not new revenue)
}

/**
 * Calculate age from birthdate
 */
function calculateAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export async function GET() {
  try {
    logger.info({}, '📊 POS customers API called');
    const supabase = createAdminClient();

    // Fetch all customers with role 'customer' (paginated to bypass 1000-row cap)
    const PAGE_SIZE = 1000;
    const users: DbUser[] = [];
    let from = 0;
    while (true) {
      const { data: pageData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (usersError) {
        logger.error(
          { error: usersError, code: usersError.code, details: usersError.details },
          'Failed to fetch customers from database'
        );
        return NextResponse.json(
          { error: 'Failed to fetch customers', details: usersError.message },
          { status: 500 }
        );
      }

      const rows = (pageData || []) as DbUser[];
      users.push(...rows);
      if (rows.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    if (users.length === 0) {
      logger.info({}, 'POS customers: No customers found');
      return NextResponse.json({ customers: [] });
    }

    // Fetch related data in chunked batches to avoid URL length limits
    const customerIds = users.map((u) => u.id);

    const [allChildren, allSessions, allPurchases] = await Promise.all([
      chunkedIn<DbChild>(supabase, 'children', 'customer_id', customerIds),
      chunkedIn<DbSession>(supabase, 'sessions', 'customer_id', customerIds, {
        isNull: 'end_time',
      }),
      chunkedIn<DbPurchase>(supabase, 'purchases', 'customer_id', customerIds, {
        orderBy: 'purchase_date', orderAsc: false,
      }),
    ]);

    // Map children to their customers
    const childrenByCustomer = new Map<string, FormattedChild[]>();
    for (const child of allChildren) {
      const customerId = child.customer_id;
      if (!childrenByCustomer.has(customerId)) {
        childrenByCustomer.set(customerId, []);
      }
      childrenByCustomer.get(customerId)!.push({
        id: child.id,
        name: child.name,
        birthdate: child.birthdate,
        waiver_signed: child.waiver_signed,
        waiver_signed_date: child.waiver_signed_date,
        created_at: child.created_at,
      });
    }

    // Fetch purchase_children for family passes
    const purchaseIds = allPurchases.map((p) => p.id);
    const childIdsByPurchase = new Map<string, string[]>();

    if (purchaseIds.length > 0) {
      const purchaseChildrenData = await chunkedIn<{ purchase_id: string; child_id: string }>(
        supabase, 'purchase_children', 'purchase_id', purchaseIds,
        { select: 'purchase_id, child_id' },
      );

      for (const pc of purchaseChildrenData) {
        if (!childIdsByPurchase.has(pc.purchase_id)) {
          childIdsByPurchase.set(pc.purchase_id, []);
        }
        childIdsByPurchase.get(pc.purchase_id)!.push(pc.child_id);
      }
    }

    // Map purchases to their customers
    const purchasesByCustomer = new Map<string, FormattedPurchase[]>();
    for (const purchase of allPurchases) {
      const customerId = purchase.customer_id;
      if (!purchasesByCustomer.has(customerId)) {
        purchasesByCustomer.set(customerId, []);
      }
      purchasesByCustomer.get(customerId)!.push({
        id: purchase.id,
        type: purchase.type,
        name: purchase.name,
        price: purchase.price,
        purchaseDate: purchase.purchase_date,
        expiryDate: purchase.expiry_date,
        firstUseDate: purchase.first_use_date,
        actualExpiryDate: purchase.actual_expiry_date,
        usedSessions: purchase.used_sessions,
        totalSessions: purchase.total_sessions,
        status: purchase.status,
        autoRenew: purchase.auto_renew,
        childId: purchase.child_id,
        childIds: childIdsByPurchase.get(purchase.id) || [],
        giftCardAmountUsed: Number(purchase.gift_card_amount_used || 0),
      });
    }

    // Map sessions to their customers
    const sessionsByCustomer = new Map<string, FormattedSession[]>();
    for (const session of allSessions) {
      const customerId = session.customer_id;
      if (!sessionsByCustomer.has(customerId)) {
        sessionsByCustomer.set(customerId, []);
      }
      sessionsByCustomer.get(customerId)!.push({
        id: session.id,
        customerId: session.customer_id,
        purchaseId: session.purchase_id,
        startTime: session.start_time,
        endTime: session.end_time,
        duration: session.duration,
        autoCheckoutTime: session.auto_checkout_time,
      });
    }

    // Format response to match the AdminPanel expected structure
    const customers = users.map((user) => {
      const userChildren = childrenByCustomer.get(user.id) || [];
      const userSessions = sessionsByCustomer.get(user.id) || [];
      return {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        children: userChildren.map((child) => ({
          id: child.id,
          name: child.name,
          birthdate: child.birthdate,
          age: calculateAge(child.birthdate),
          waiverSigned: child.waiver_signed,
          waiverSignedDate: child.waiver_signed_date,
          createdAt: child.created_at,
        })),
        purchases: purchasesByCustomer.get(user.id) || [],
        activeSessions: userSessions,
        savedCards: [], // Payment methods would need a separate fetch if needed
        giftCardBalance: Number(user.gift_card_balance) || 0, // Account credit from redeemed gift cards
        createdAt: user.created_at,
        lastVisit: user.last_login,
        // `notes` exists on the row (select '*') but is absent from the stale generated type
        notes: (user as DbUser & { notes?: string | null }).notes ?? null,
      };
    });

    logger.info(
      { customerCount: customers.length },
      'POS customers fetched successfully'
    );

    return NextResponse.json({ customers });
  } catch (error) {
    logger.error({ error }, 'POS customers fetch error');
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
