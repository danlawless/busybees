/**
 * API Route: Admin Reports - Pass/Membership Analytics
 * Active passes by type, sales trend, usage rates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  parseDateRange,
  parseGranularity,
  bucketDate,
  fetchAllRows,
} from '@/lib/services/report-aggregations';
import { requireAdmin } from '@/lib/auth/requireRole';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const range = parseDateRange(searchParams);
    const granularity = parseGranularity(searchParams);

    const [purchases, allPassPurchases] = await Promise.all([
      // Pass purchases in date range
      fetchAllRows((from, to) =>
        supabase
          .from('purchases')
          .select('*')
          .in('type', ['day_pass', 'weekly_pass', 'monthly_pass'])
          .is('guest_of_purchase_id', null)
          // $0 member guest passes are not sales (see 057).
          .gte('purchase_date', range.startDate)
          .lte('purchase_date', range.endDate + 'T23:59:59')
          .order('purchase_date', { ascending: true })
          .range(from, to)
      ),
      // All pass purchases for active/expired counts
      fetchAllRows((from, to) =>
        supabase
          .from('purchases')
          .select('type, status, used_sessions, total_sessions')
          .in('type', ['day_pass', 'weekly_pass', 'monthly_pass'])
          .is('guest_of_purchase_id', null)
          // $0 member guest passes are not sales (see 057).
          .range(from, to)
      ),
    ]);

    // Active passes by type (donut chart)
    const activeByType: Record<string, number> = {
      'Day Pass': 0,
      'Weekly Pass': 0,
      'Monthly Pass': 0,
    };
    const typeLabels: Record<string, string> = {
      day_pass: 'Day Pass',
      weekly_pass: 'Weekly Pass',
      monthly_pass: 'Monthly Pass',
    };
    for (const p of allPassPurchases) {
      if (p.status === 'active') {
        const label = typeLabels[p.type] || p.type;
        activeByType[label] = (activeByType[label] || 0) + 1;
      }
    }

    // Sales trend by category over time
    const salesTrendMap = new Map<
      string,
      { day: number; weekly: number; monthly: number }
    >();
    for (const p of purchases) {
      const dateKey = p.purchase_date.slice(0, 10);
      const bucket = bucketDate(dateKey, granularity);
      const entry = salesTrendMap.get(bucket) || {
        day: 0,
        weekly: 0,
        monthly: 0,
      };
      if (p.type === 'day_pass') entry.day += 1;
      else if (p.type === 'weekly_pass') entry.weekly += 1;
      else if (p.type === 'monthly_pass') entry.monthly += 1;
      salesTrendMap.set(bucket, entry);
    }
    const salesTrend = Array.from(salesTrendMap.entries())
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Active vs Expired over time
    const activeVsExpiredMap = new Map<
      string,
      { active: number; expired: number }
    >();
    for (const p of purchases) {
      const dateKey = p.purchase_date.slice(0, 10);
      const bucket = bucketDate(dateKey, granularity);
      const entry = activeVsExpiredMap.get(bucket) || {
        active: 0,
        expired: 0,
      };
      if (p.status === 'active') entry.active += 1;
      else entry.expired += 1;
      activeVsExpiredMap.set(bucket, entry);
    }
    const activeVsExpired = Array.from(activeVsExpiredMap.entries())
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Usage rates per pass type
    const usageByType: Record<
      string,
      { totalUsed: number; totalIncluded: number; count: number }
    > = {};
    for (const p of allPassPurchases) {
      const label = typeLabels[p.type] || p.type;
      if (!usageByType[label]) {
        usageByType[label] = { totalUsed: 0, totalIncluded: 0, count: 0 };
      }
      usageByType[label].totalUsed += p.used_sessions;
      usageByType[label].totalIncluded += p.total_sessions;
      usageByType[label].count += 1;
    }
    const usageRates = Object.entries(usageByType).map(([type, d]) => ({
      type,
      avgUsed: d.count > 0 ? Math.round((d.totalUsed / d.count) * 10) / 10 : 0,
      included: d.count > 0 ? Math.round(d.totalIncluded / d.count) : 0,
      rate:
        d.totalIncluded > 0
          ? Math.round((d.totalUsed / d.totalIncluded) * 100)
          : 0,
    }));

    // Member guest passes in range, and how many of those families have since
    // bought something themselves -- the measure of whether the perk works.
    const guestRows = await fetchAllRows((from, to) =>
      supabase
        .from('purchases')
        .select('customer_id, purchase_date')
        .not('guest_of_purchase_id', 'is', null)
        .gte('purchase_date', range.startDate)
        .lte('purchase_date', range.endDate + 'T23:59:59')
        .range(from, to)
    );
    const guestFamilies = [...new Set(guestRows.map((g) => g.customer_id))];
    let returnedAndPaid = 0;
    if (guestFamilies.length > 0) {
      const paidCustomerIds = new Set<string>();
      // Chunk into groups of 100 to avoid URL limits
      for (let i = 0; i < guestFamilies.length; i += 100) {
        const chunk = guestFamilies.slice(i, i + 100);
        const paidChunk = await fetchAllRows((from, to) =>
          supabase
            .from('purchases')
            .select('customer_id')
            .in('customer_id', chunk)
            .is('guest_of_purchase_id', null)
            .gt('price', 0)
            .range(from, to)
        );
        paidChunk.forEach((p) => paidCustomerIds.add(p.customer_id));
      }
      returnedAndPaid = paidCustomerIds.size;
    }
    const guestPasses = {
      issued: guestRows.length,
      families: guestFamilies.length,
      returnedAndPaid,
    };

    return NextResponse.json({
      activeByType: Object.entries(activeByType).map(([name, value]) => ({
        name,
        value,
      })),
      salesTrend,
      activeVsExpired,
      usageRates,
      guestPasses,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch passes report');
    return NextResponse.json(
      { error: 'Failed to fetch passes report' },
      { status: 500 }
    );
  }
}
