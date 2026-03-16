/**
 * API Route: Top Customers by Check-In Count
 * GET - Returns top 10 customers sorted by total session (check-in) count
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Get session counts grouped by customer
    const { data: sessionCounts, error: sessionError } = await supabase
      .from('sessions')
      .select('customer_id');

    if (sessionError) {
      logger.error({ error: sessionError }, 'Failed to fetch session counts');
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    // Count sessions per customer
    const countMap = new Map<string, number>();
    for (const session of sessionCounts || []) {
      if (session.customer_id) {
        countMap.set(session.customer_id, (countMap.get(session.customer_id) || 0) + 1);
      }
    }

    // Sort by count and take top 10
    const topCustomerIds = Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (topCustomerIds.length === 0) {
      return NextResponse.json({ topCustomers: [] });
    }

    // Fetch customer details
    const { data: customers, error: customerError } = await supabase
      .from('users')
      .select('id, name, email, phone')
      .in('id', topCustomerIds.map(([id]) => id));

    if (customerError) {
      logger.error({ error: customerError }, 'Failed to fetch customer details');
      return NextResponse.json({ error: 'Failed to fetch customer details' }, { status: 500 });
    }

    const customerMap = new Map((customers || []).map(c => [c.id, c]));

    // Check which customers have active monthly passes or punch cards, and total spend
    const { data: allPurchases } = await supabase
      .from('purchases')
      .select('customer_id, type, status, price')
      .in('customer_id', topCustomerIds.map(([id]) => id));

    const activePasses = (allPurchases || []).filter(
      p => ['monthly_pass', 'weekly_pass'].includes(p.type) && p.status === 'active'
    );

    const activeMonthlySet = new Set<string>();
    const activePunchCardSet = new Set<string>();
    const totalSpendMap = new Map<string, number>();
    for (const p of activePasses) {
      if (p.type === 'monthly_pass') activeMonthlySet.add(p.customer_id);
      if (p.type === 'weekly_pass') activePunchCardSet.add(p.customer_id);
    }
    for (const p of allPurchases || []) {
      totalSpendMap.set(p.customer_id, (totalSpendMap.get(p.customer_id) || 0) + Number(p.price || 0));
    }

    const topCustomers = topCustomerIds.map(([id, count], index) => {
      const customer = customerMap.get(id);
      return {
        rank: index + 1,
        customerId: id,
        name: customer?.name || 'Unknown',
        email: customer?.email || '',
        phone: customer?.phone || '',
        checkInCount: count,
        hasActiveMonthlyPass: activeMonthlySet.has(id),
        hasActivePunchCard: activePunchCardSet.has(id),
        totalSpend: totalSpendMap.get(id) || 0,
      };
    });

    return NextResponse.json({ topCustomers });
  } catch (error) {
    logger.error({ error }, 'Top customers fetch error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
