/**
 * API Route: Admin Punch Cards
 * GET - List all active punch card purchases with customer/child info and remaining visits
 *
 * Uses admin client to bypass RLS since POS staff auth is PIN-based.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch active punch card purchases (weekly_pass type or name contains 'punch')
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('id, customer_id, child_id, pass_scope, name, price, purchase_date, expiry_date, first_use_date, actual_expiry_date, status, used_sessions, total_sessions')
      .eq('status', 'active')
      .order('purchase_date', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch punch card purchases');
      return NextResponse.json({ error: 'Failed to fetch punch cards' }, { status: 500 });
    }

    // Filter to only punch cards (weekly_pass type or name includes 'punch')
    const punchCards = (purchases || []).filter(p =>
      p.name?.toLowerCase().includes('punch')
    );

    // Get unique customer IDs
    const customerIds = [...new Set(punchCards.map(p => p.customer_id))];

    // Fetch customer details
    const customerMap = new Map<string, { name: string; phone: string; email: string | null }>();
    if (customerIds.length > 0) {
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
    const childIds = [...new Set(punchCards.map(p => p.child_id).filter(Boolean))] as string[];
    const childMap = new Map<string, string>();
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
    const cards = punchCards.map(p => {
      const customer = customerMap.get(p.customer_id);
      const remaining = Math.max(0, (p.total_sessions || 0) - (p.used_sessions || 0));
      return {
        id: p.id,
        customerName: customer?.name || 'Unknown',
        customerPhone: customer?.phone || '',
        customerEmail: customer?.email || null,
        passScope: p.pass_scope,
        childName: p.child_id ? (childMap.get(p.child_id) || 'Unknown') : null,
        passName: p.name,
        price: p.price,
        purchaseDate: p.purchase_date,
        firstUseDate: p.first_use_date,
        expiryDate: p.actual_expiry_date || p.expiry_date,
        usedSessions: p.used_sessions || 0,
        totalSessions: p.total_sessions || 0,
        remainingSessions: remaining,
      };
    });

    const totalRemaining = cards.reduce((sum, c) => sum + c.remainingSessions, 0);

    const stats = {
      total: cards.length,
      totalRemaining,
      totalUsed: cards.reduce((sum, c) => sum + c.usedSessions, 0),
    };

    return NextResponse.json({ cards, stats });
  } catch (error) {
    logger.error({ error }, 'Punch cards fetch error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
