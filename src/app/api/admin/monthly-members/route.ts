/**
 * API Route: Admin Monthly Pass Members
 * GET - List all customers with monthly pass purchases
 *
 * Uses admin client to bypass RLS since POS staff auth is PIN-based.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch all monthly pass purchases with customer info
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('id, customer_id, child_id, name, price, purchase_date, expiry_date, actual_expiry_date, status, auto_renew, next_renewal_date, used_sessions, total_sessions')
      .eq('type', 'monthly_pass')
      .order('purchase_date', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch monthly pass purchases');
      return NextResponse.json({ error: 'Failed to fetch monthly members' }, { status: 500 });
    }

    const allPurchases = purchases || [];

    // Lazy-expire passes whose effective expiry has passed. Uses actual_expiry_date
    // when the pass has been used, otherwise the intended expiry_date.
    const now = new Date();
    const idsToExpire: string[] = [];
    for (const p of allPurchases) {
      if (p.status !== 'active') continue;
      const effectiveExpiry = p.actual_expiry_date ?? p.expiry_date;
      if (effectiveExpiry && new Date(effectiveExpiry) < now) {
        p.status = 'expired';
        idsToExpire.push(p.id);
      }
    }
    if (idsToExpire.length > 0) {
      const { error: updateError } = await supabase
        .from('purchases')
        .update({ status: 'expired' })
        .in('id', idsToExpire);
      if (updateError) {
        logger.error({ error: updateError, idsToExpire }, 'Failed to persist lazy expiration');
      }
    }

    // Get unique customer IDs
    const customerIds = [...new Set(allPurchases.map(p => p.customer_id))];

    // Fetch customer details
    let customerMap = new Map<string, { name: string; phone: string; email: string | null }>();
    if (customerIds.length > 0) {
      // Chunk to avoid URL length limits
      const CHUNK_SIZE = 100;
      for (let i = 0; i < customerIds.length; i += CHUNK_SIZE) {
        const chunk = customerIds.slice(i, i + CHUNK_SIZE);
        const { data: customers } = await supabase
          .from('users')
          .select('id, name, phone, email')
          .in('id', chunk);

        for (const c of customers || []) {
          customerMap.set(c.id, { name: c.name, phone: c.phone, email: c.email });
        }
      }
    }

    // Get unique child IDs
    const childIds = [...new Set(allPurchases.map(p => p.child_id).filter(Boolean))] as string[];
    let childMap = new Map<string, string>();
    if (childIds.length > 0) {
      const { data: children } = await supabase
        .from('children')
        .select('id, name')
        .in('id', childIds);

      for (const c of children || []) {
        childMap.set(c.id, c.name);
      }
    }

    // Build response
    const members = allPurchases.map(p => {
      const customer = customerMap.get(p.customer_id);
      return {
        id: p.id,
        customerName: customer?.name || 'Unknown',
        customerPhone: customer?.phone || '',
        customerEmail: customer?.email || null,
        childName: p.child_id ? (childMap.get(p.child_id) || 'Unknown') : null,
        passName: p.name,
        price: p.price,
        purchaseDate: p.purchase_date,
        expiryDate: p.expiry_date,
        status: p.status,
        autoRenew: p.auto_renew,
        nextRenewalDate: p.next_renewal_date,
        usedSessions: p.used_sessions,
        totalSessions: p.total_sessions,
      };
    });

    const stats = {
      total: members.length,
      active: members.filter(m => m.status === 'active').length,
      expired: members.filter(m => m.status === 'expired').length,
      autoRenewEnabled: members.filter(m => m.autoRenew && m.status === 'active').length,
    };

    return NextResponse.json({ members, stats });
  } catch (error) {
    logger.error({ error }, 'Monthly members fetch error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
