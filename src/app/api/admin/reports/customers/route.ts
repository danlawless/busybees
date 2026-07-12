/**
 * API Route: Admin Reports - Customer Analytics
 * Growth, visit frequency, top customers, age distribution
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

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const range = parseDateRange(searchParams);
    const granularity = parseGranularity(searchParams);

    const [totalCustomersRes, customers, purchases, children] = await Promise.all([
      // True total count (bypasses the 1000-row data cap)
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'customer' as const),
      fetchAllRows((from, to) =>
        supabase
          .from('users')
          .select('id, name, phone, created_at')
          .eq('role', 'customer' as const)
          .order('created_at', { ascending: true })
          .range(from, to)
      ),
      fetchAllRows((from, to) =>
        supabase
          .from('purchases')
          .select('customer_id, price, purchase_date')
          .gte('purchase_date', range.startDate)
          .lte('purchase_date', range.endDate + 'T23:59:59')
          .range(from, to)
      ),
      fetchAllRows((from, to) =>
        supabase.from('children').select('birthdate').range(from, to)
      ),
    ]);

    const totalCustomers = totalCustomersRes.count ?? customers.length;

    // Customer growth over time
    const growthMap = new Map<string, { total: number; new: number }>();
    let cumulative = 0;
    const sortedCustomers = [...customers].sort(
      (a, b) => a.created_at.localeCompare(b.created_at)
    );

    for (const c of sortedCustomers) {
      const dateKey = c.created_at.slice(0, 10);
      if (dateKey < range.startDate || dateKey > range.endDate) {
        cumulative++;
        continue;
      }
      const bucket = bucketDate(dateKey, granularity);
      cumulative++;
      const entry = growthMap.get(bucket) || { total: 0, new: 0 };
      entry.total = cumulative;
      entry.new += 1;
      growthMap.set(bucket, entry);
    }
    const growth = Array.from(growthMap.entries())
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Visit frequency (number of purchases per customer in range)
    const customerPurchaseCount = new Map<string, number>();
    for (const p of purchases) {
      customerPurchaseCount.set(
        p.customer_id,
        (customerPurchaseCount.get(p.customer_id) || 0) + 1
      );
    }
    const freqBuckets: Record<string, number> = {
      '1 visit': 0,
      '2 visits': 0,
      '3 visits': 0,
      '4-5 visits': 0,
      '6+ visits': 0,
    };
    for (const count of customerPurchaseCount.values()) {
      if (count === 1) freqBuckets['1 visit']++;
      else if (count === 2) freqBuckets['2 visits']++;
      else if (count === 3) freqBuckets['3 visits']++;
      else if (count <= 5) freqBuckets['4-5 visits']++;
      else freqBuckets['6+ visits']++;
    }
    const visitFrequency = Object.entries(freqBuckets).map(([visits, count]) => ({
      visits,
      count,
    }));

    // Top customers by spend
    const customerSpend = new Map<string, { totalSpend: number; visitCount: number }>();
    for (const p of purchases) {
      const entry = customerSpend.get(p.customer_id) || {
        totalSpend: 0,
        visitCount: 0,
      };
      entry.totalSpend += Number(p.price);
      entry.visitCount += 1;
      customerSpend.set(p.customer_id, entry);
    }

    const customerMap = new Map(customers.map((c) => [c.id, c]));
    const topCustomers = Array.from(customerSpend.entries())
      .map(([id, data]) => {
        const cust = customerMap.get(id);
        return {
          id,
          name: cust?.name || 'Unknown',
          phone: cust?.phone || '',
          totalSpend: data.totalSpend,
          visitCount: data.visitCount,
        };
      })
      .sort((a, b) => b.visitCount - a.visitCount || b.totalSpend - a.totalSpend)
      .slice(0, 20);

    // Children age distribution
    const now = new Date();
    const ageCounts: Record<string, number> = {
      'Under 1': 0,
      '1 year': 0,
      '2 years': 0,
      '3 years': 0,
      '4 years': 0,
      '5 years': 0,
      '6 years': 0,
      '7+ years': 0,
    };
    for (const child of children) {
      const birth = new Date(child.birthdate);
      let age = now.getFullYear() - birth.getFullYear();
      const monthDiff = now.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      if (age < 1) ageCounts['Under 1']++;
      else if (age === 1) ageCounts['1 year']++;
      else if (age === 2) ageCounts['2 years']++;
      else if (age === 3) ageCounts['3 years']++;
      else if (age === 4) ageCounts['4 years']++;
      else if (age === 5) ageCounts['5 years']++;
      else if (age === 6) ageCounts['6 years']++;
      else ageCounts['7+ years']++;
    }
    const ageDistribution = Object.entries(ageCounts).map(([age, count]) => ({
      age,
      count,
    }));

    // New vs returning by period
    const firstPurchaseDate = new Map<string, string>();
    // We need all purchases to determine first visit, not just in range
    const allPurchases = await fetchAllRows((from, to) =>
      supabase
        .from('purchases')
        .select('customer_id, purchase_date')
        .order('purchase_date', { ascending: true })
        .range(from, to)
    );

    for (const p of allPurchases) {
      if (!firstPurchaseDate.has(p.customer_id)) {
        firstPurchaseDate.set(p.customer_id, p.purchase_date.slice(0, 10));
      }
    }

    const newVsReturningMap = new Map<string, { new: number; returning: number }>();
    for (const p of purchases) {
      const dateKey = p.purchase_date.slice(0, 10);
      const bucket = bucketDate(dateKey, granularity);
      const entry = newVsReturningMap.get(bucket) || { new: 0, returning: 0 };
      const firstDate = firstPurchaseDate.get(p.customer_id);
      if (firstDate && firstDate >= range.startDate && firstDate === dateKey) {
        entry.new += 1;
      } else {
        entry.returning += 1;
      }
      newVsReturningMap.set(bucket, entry);
    }
    const newVsReturning = Array.from(newVsReturningMap.entries())
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      growth,
      visitFrequency,
      topCustomers,
      ageDistribution,
      totalCustomers,
      newVsReturning,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch customer report');
    return NextResponse.json(
      { error: 'Failed to fetch customer report' },
      { status: 500 }
    );
  }
}
