/**
 * API Route: Admin Reports - Gift Cards & Marketing
 * Gift card sales/redemptions, newsletter, promos
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  parseDateRange,
  parseGranularity,
  bucketDate,
  todayStr,
} from '@/lib/services/report-aggregations';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const range = parseDateRange(searchParams);
    const granularity = parseGranularity(searchParams);

    type SubscriberRow = { subscribed_at: string; source: string | null; is_active: boolean };

    const fetchAllSubscribers = async (): Promise<SubscriberRow[]> => {
      const PAGE_SIZE = 1000;
      const out: SubscriberRow[] = [];
      let from = 0;
      while (true) {
        const { data } = await supabase
          .from('newsletter_subscribers')
          .select('subscribed_at, source, is_active')
          .order('subscribed_at', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        const rows = (data || []) as SubscriberRow[];
        out.push(...rows);
        if (rows.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return out;
    };

    const [
      giftCardsRes,
      redemptionsRes,
      allGiftCardsRes,
      subscribers,
      promosRes,
    ] = await Promise.all([
      // Gift cards in range
      supabase
        .from('gift_cards')
        .select('*')
        .gte('created_at', range.startDate)
        .lte('created_at', range.endDate + 'T23:59:59')
        .neq('status', 'pending')
        .order('created_at', { ascending: true }),
      // Redemptions in range
      supabase
        .from('gift_card_redemptions')
        .select('*')
        .gte('created_at', range.startDate)
        .lte('created_at', range.endDate + 'T23:59:59')
        .order('created_at', { ascending: true }),
      // All gift cards for outstanding balance
      supabase
        .from('gift_cards')
        .select('remaining_amount, status')
        .neq('status', 'pending'),
      // Newsletter subscribers (paginated to bypass 1000-row cap)
      fetchAllSubscribers(),
      // Active promos
      supabase
        .from('promos')
        .select('id, name, discount_percent, start_date, end_date, is_active')
        .eq('is_active', true)
        .gte('end_date', todayStr()),
    ]);

    const giftCards = giftCardsRes.data || [];
    const redemptions = redemptionsRes.data || [];
    const allGiftCards = allGiftCardsRes.data || [];
    const promos = promosRes.data || [];

    // Gift card sales & redemptions over time
    const gcSalesMap = new Map<string, number>();
    const gcRedemptionsMap = new Map<string, number>();

    for (const gc of giftCards) {
      const dateKey = gc.created_at.slice(0, 10);
      const bucket = bucketDate(dateKey, granularity);
      gcSalesMap.set(bucket, (gcSalesMap.get(bucket) || 0) + Number(gc.amount));
    }
    for (const r of redemptions) {
      const dateKey = r.created_at.slice(0, 10);
      const bucket = bucketDate(dateKey, granularity);
      gcRedemptionsMap.set(
        bucket,
        (gcRedemptionsMap.get(bucket) || 0) + Number(r.amount)
      );
    }

    const allDates = new Set([...gcSalesMap.keys(), ...gcRedemptionsMap.keys()]);
    const giftCardSales = Array.from(allDates)
      .map((date) => ({
        date,
        sales: gcSalesMap.get(date) || 0,
        redemptions: gcRedemptionsMap.get(date) || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Outstanding unredeemed balance
    const outstandingBalance = allGiftCards
      .filter(
        (gc) => gc.status === 'sent' || gc.status === 'partially_redeemed'
      )
      .reduce((s, gc) => s + Number(gc.remaining_amount), 0);

    // Gift card status distribution
    const statusCounts: Record<string, number> = {};
    for (const gc of allGiftCards) {
      const label =
        gc.status === 'partially_redeemed'
          ? 'Partially Redeemed'
          : gc.status.charAt(0).toUpperCase() + gc.status.slice(1);
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    }
    const giftCardStatus = Object.entries(statusCounts).map(
      ([name, value]) => ({ name, value })
    );

    // Newsletter subscriber growth
    const subGrowthMap = new Map<string, number>();
    let subCumulative = 0;
    for (const sub of subscribers) {
      if (!sub.is_active) continue;
      subCumulative++;
      const dateKey = sub.subscribed_at.slice(0, 10);
      if (dateKey >= range.startDate && dateKey <= range.endDate) {
        const bucket = bucketDate(dateKey, granularity);
        subGrowthMap.set(bucket, subCumulative);
      }
    }
    const subscriberGrowth = Array.from(subGrowthMap.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Subscriber source breakdown
    const sourceCounts: Record<string, number> = {};
    for (const sub of subscribers) {
      if (sub.is_active) {
        const source = sub.source || 'unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      }
    }
    const subscriberSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    // Active promos
    const activePromos = promos.map((p) => ({
      id: p.id,
      name: p.name,
      discountPercent: p.discount_percent,
      startDate: p.start_date,
      endDate: p.end_date,
    }));

    return NextResponse.json({
      giftCardSales,
      outstandingBalance,
      giftCardStatus,
      subscriberGrowth,
      subscriberSources,
      activePromos,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch marketing report');
    return NextResponse.json(
      { error: 'Failed to fetch marketing report' },
      { status: 500 }
    );
  }
}
