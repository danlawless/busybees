/**
 * API Route: Admin Reports - Revenue Analytics
 * Revenue time series, by-type breakdown, comparisons
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  parseDateRange,
  parseGranularity,
  bucketDate,
  purchaseTypeLabel,
  formatDateET,
  fetchAllRows,
} from '@/lib/services/report-aggregations';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const range = parseDateRange(searchParams);
    const granularity = parseGranularity(searchParams);

    // Calculate previous period for comparison
    const startDate = new Date(range.startDate + 'T00:00:00');
    const endDate = new Date(range.endDate + 'T00:00:00');
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const prevEnd = new Date(startDate);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - daysDiff);

    const fmt = (d: Date) => formatDateET(d);

    // Fetch current and previous period in parallel, plus gift cards
    const [purchases, previousPurchases, giftCards, previousGiftCards] = await Promise.all([
      fetchAllRows((from, to) =>
        supabase
          .from('purchases')
          .select('purchase_date, price, type, gift_card_amount_used')
          .gte('purchase_date', range.startDate)
          .lte('purchase_date', range.endDate + 'T23:59:59')
          .order('purchase_date', { ascending: true })
          .range(from, to)
      ),
      fetchAllRows((from, to) =>
        supabase
          .from('purchases')
          .select('price, gift_card_amount_used')
          .gte('purchase_date', fmt(prevStart))
          .lte('purchase_date', fmt(prevEnd) + 'T23:59:59')
          .range(from, to)
      ),
      fetchAllRows((from, to) =>
        supabase
          .from('gift_cards')
          .select('created_at, amount')
          .gte('created_at', range.startDate)
          .lte('created_at', range.endDate + 'T23:59:59')
          .neq('status', 'pending')
          .range(from, to)
      ),
      fetchAllRows((from, to) =>
        supabase
          .from('gift_cards')
          .select('amount')
          .gte('created_at', fmt(prevStart))
          .lte('created_at', fmt(prevEnd) + 'T23:59:59')
          .neq('status', 'pending')
          .range(from, to)
      ),
    ]);

    // Build time series grouped by granularity
    const timeSeriesMap = new Map<
      string,
      {
        dayPass: number;
        weeklyPass: number;
        monthlyPass: number;
        partyPackage: number;
        foodBeverage: number;
        afterDark: number;
        giftCard: number;
        total: number;
        txCount: number;
      }
    >();

    for (const p of purchases) {
      const dateKey = p.purchase_date.slice(0, 10);
      const bucket = bucketDate(dateKey, granularity);
      const entry = timeSeriesMap.get(bucket) || {
        dayPass: 0,
        weeklyPass: 0,
        monthlyPass: 0,
        partyPackage: 0,
        foodBeverage: 0,
        afterDark: 0,
        giftCard: 0,
        total: 0,
        txCount: 0,
      };

      // Coerce NUMERIC - Supabase returns NUMERIC(10,2) as strings
      // Net revenue = price minus gift card amount already counted when the gift card was sold
      const price = Math.max(0, Number(p.price) - Number(p.gift_card_amount_used || 0));
      switch (p.type) {
        case 'day_pass':
          entry.dayPass += price;
          break;
        case 'weekly_pass':
          entry.weeklyPass += price;
          break;
        case 'monthly_pass':
          entry.monthlyPass += price;
          break;
        case 'party_package':
          entry.partyPackage += price;
          break;
        case 'food_beverage':
          entry.foodBeverage += price;
          break;
        case 'after_dark':
          entry.afterDark += price;
          break;
      }
      entry.total += price;
      entry.txCount += 1;
      timeSeriesMap.set(bucket, entry);
    }

    // Add gift card revenue to time series
    for (const g of giftCards) {
      const dateKey = g.created_at.slice(0, 10);
      const bucket = bucketDate(dateKey, granularity);
      const entry = timeSeriesMap.get(bucket) || {
        dayPass: 0,
        weeklyPass: 0,
        monthlyPass: 0,
        partyPackage: 0,
        foodBeverage: 0,
        afterDark: 0,
        giftCard: 0,
        total: 0,
        txCount: 0,
      };
      const gAmount = Number(g.amount);
      entry.giftCard += gAmount;
      entry.total += gAmount;
      entry.txCount += 1;
      timeSeriesMap.set(bucket, entry);
    }

    const timeSeries = Array.from(timeSeriesMap.entries())
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Revenue breakdown by type (net of gift card redemption to avoid double-counting)
    const breakdownMap = new Map<string, number>();
    for (const p of purchases) {
      const label = purchaseTypeLabel(p.type);
      const net = Math.max(0, Number(p.price) - Number(p.gift_card_amount_used || 0));
      breakdownMap.set(label, (breakdownMap.get(label) || 0) + net);
    }
    const giftCardTotal = giftCards.reduce((s, g) => s + Number(g.amount), 0);
    if (giftCardTotal > 0) {
      breakdownMap.set('Gift Cards', giftCardTotal);
    }
    const breakdown = Array.from(breakdownMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    // Average transaction value over time (net of gift card redemption)
    const avgTxMap = new Map<string, { total: number; count: number }>();
    for (const p of purchases) {
      const dateKey = p.purchase_date.slice(0, 10);
      const bucket = bucketDate(dateKey, granularity);
      const entry = avgTxMap.get(bucket) || { total: 0, count: 0 };
      entry.total += Math.max(0, Number(p.price) - Number(p.gift_card_amount_used || 0));
      entry.count += 1;
      avgTxMap.set(bucket, entry);
    }
    const avgTransactionValue = Array.from(avgTxMap.entries())
      .map(([date, d]) => ({
        date,
        value: d.count > 0 ? Math.round(d.total / d.count) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const netPurchase = (p: { price: number | string; gift_card_amount_used?: number | string | null }) =>
      Math.max(0, Number(p.price) - Number(p.gift_card_amount_used || 0));
    const currentPeriodTotal =
      purchases.reduce((s, p) => s + netPurchase(p), 0) + giftCardTotal;
    const previousPeriodTotal =
      previousPurchases.reduce((s, p) => s + netPurchase(p), 0) +
      previousGiftCards.reduce((s, g) => s + Number(g.amount), 0);

    return NextResponse.json({
      timeSeries,
      breakdown,
      avgTransactionValue,
      currentPeriodTotal,
      previousPeriodTotal,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch revenue report');
    return NextResponse.json(
      { error: 'Failed to fetch revenue report' },
      { status: 500 }
    );
  }
}
