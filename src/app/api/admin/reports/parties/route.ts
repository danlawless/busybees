/**
 * API Route: Admin Reports - Party Booking Analytics
 * Bookings by status/type/package, day-of-week, discounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  parseDateRange,
  parseGranularity,
  bucketDate,
  dayOfWeekLabel,
  todayStr,
  fetchAllRows,
} from '@/lib/services/report-aggregations';

const PACKAGE_LABELS: Record<string, string> = {
  queen_bee: 'Queen Bee',
  worker_bee: 'Worker Bee',
  basic_bee: 'Basic Bee',
  group_rate: 'Group Rate',
};

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const range = parseDateRange(searchParams);
    const granularity = parseGranularity(searchParams);

    const [bookings, upcomingRes] = await Promise.all([
      fetchAllRows((from, to) =>
        supabase
          .from('party_bookings')
          .select('*')
          .gte('party_date', range.startDate)
          .lte('party_date', range.endDate)
          .order('party_date', { ascending: true })
          .range(from, to)
      ),
      // Upcoming confirmed parties (next 30 days)
      supabase
        .from('party_bookings')
        .select('id, customer_name, child_name, party_date, package_name, guest_count, total_price')
        .eq('status', 'confirmed')
        .gte('party_date', todayStr())
        .order('party_date', { ascending: true })
        .limit(10),
    ]);

    const upcomingParties = (upcomingRes.data || []).map((p) => ({
      ...p,
      packageName: PACKAGE_LABELS[p.package_name] || p.package_name,
    }));

    // Bookings over time
    const bookingsOverTimeMap = new Map<string, number>();
    for (const b of bookings) {
      const bucket = bucketDate(b.party_date, granularity);
      bookingsOverTimeMap.set(bucket, (bookingsOverTimeMap.get(bucket) || 0) + 1);
    }
    const bookingsOverTime = Array.from(bookingsOverTimeMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // By status (donut)
    const statusCounts: Record<string, number> = {};
    for (const b of bookings) {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    }
    const byStatus = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));

    // Revenue by package
    const packageRevenue: Record<string, number> = {};
    for (const b of bookings) {
      if (b.status !== 'cancelled') {
        const label = PACKAGE_LABELS[b.package_name] || b.package_name;
        packageRevenue[label] = (packageRevenue[label] || 0) + Number(b.total_price);
      }
    }
    const revenueByPackage = Object.entries(packageRevenue).map(
      ([name, value]) => ({ name, value })
    );

    // Day of week popularity
    const dowCounts = new Array(7).fill(0);
    for (const b of bookings) {
      const d = new Date(b.party_date + 'T00:00:00');
      dowCounts[d.getDay()] += 1;
    }
    const dayOfWeek = dowCounts.map((count, i) => ({
      day: dayOfWeekLabel(i),
      count,
    }));

    // Average party size trend
    const partySizeMap = new Map<string, { total: number; count: number }>();
    for (const b of bookings) {
      if (b.status !== 'cancelled') {
        const bucket = bucketDate(b.party_date, granularity);
        const entry = partySizeMap.get(bucket) || { total: 0, count: 0 };
        entry.total += b.guest_count;
        entry.count += 1;
        partySizeMap.set(bucket, entry);
      }
    }
    const avgPartySize = Array.from(partySizeMap.entries())
      .map(([date, d]) => ({
        date,
        size: d.count > 0 ? Math.round(d.total / d.count) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Discount usage stats
    const withDiscount = bookings.filter(
      (b) => b.discount_percent > 0 || b.discount_amount > 0
    );
    const discountUsage = {
      total: bookings.length,
      withDiscount: withDiscount.length,
      avgDiscountPercent:
        withDiscount.length > 0
          ? Math.round(
              withDiscount.reduce((s, b) => s + b.discount_percent, 0) /
                withDiscount.length
            )
          : 0,
    };

    return NextResponse.json({
      bookingsOverTime,
      byStatus,
      revenueByPackage,
      dayOfWeek,
      avgPartySize,
      discountUsage,
      upcomingParties,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch parties report');
    return NextResponse.json(
      { error: 'Failed to fetch parties report' },
      { status: 500 }
    );
  }
}
