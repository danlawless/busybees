/**
 * API Route: Admin Reports - Overview
 * KPI summary + 30-day trend
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  todayStr,
  weekStartStr,
  lastWeekStartStr,
  lastWeekEndStr,
  monthStartStr,
  daysAgoStr,
  formatDateET,
} from '@/lib/services/report-aggregations';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const today = todayStr();
    const thisWeekStart = weekStartStr();
    const lastWeekStart = lastWeekStartStr();
    const lastWeekEnd = lastWeekEndStr();
    const mtdStart = monthStartStr();
    const thirtyDaysAgo = daysAgoStr(30);

    // Run all queries in parallel
    const [
      todayPurchasesRes,
      mtdPurchasesRes,
      activeSessionsRes,
      totalCustomersRes,
      trendPurchasesRes,
      thisWeekPurchasesRes,
      lastWeekPurchasesRes,
      newCustomersRes,
      todayGiftCardsRes,
      mtdGiftCardsRes,
      trendGiftCardsRes,
      thisWeekGiftCardsRes,
      lastWeekGiftCardsRes,
    ] = await Promise.all([
      // Today's revenue from purchases
      supabase
        .from('purchases')
        .select('price, type, name, gift_card_amount_used, purchase_date')
        .gte('purchase_date', today)
        .lte('purchase_date', today + 'T23:59:59'),
      // MTD revenue from purchases
      supabase
        .from('purchases')
        .select('price, gift_card_amount_used')
        .gte('purchase_date', mtdStart)
        .lte('purchase_date', today + 'T23:59:59'),
      // Active sessions (no end_time)
      supabase.from('sessions').select('id').is('end_time', null),
      // Total customers
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'customer' as const),
      // 30-day revenue trend from purchases
      supabase
        .from('purchases')
        .select('purchase_date, price, gift_card_amount_used')
        .gte('purchase_date', thirtyDaysAgo)
        .lte('purchase_date', today + 'T23:59:59')
        .order('purchase_date', { ascending: true }),
      // This week revenue from purchases
      supabase
        .from('purchases')
        .select('price, gift_card_amount_used')
        .gte('purchase_date', thisWeekStart)
        .lte('purchase_date', today + 'T23:59:59'),
      // Last week revenue from purchases
      supabase
        .from('purchases')
        .select('price, gift_card_amount_used')
        .gte('purchase_date', lastWeekStart)
        .lte('purchase_date', lastWeekEnd + 'T23:59:59'),
      // New customers this week
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'customer' as const)
        .gte('created_at', thisWeekStart),
      // Today's gift card sales
      supabase
        .from('gift_cards')
        .select('amount')
        .gte('created_at', today)
        .lte('created_at', today + 'T23:59:59')
        .neq('status', 'pending'),
      // MTD gift card sales
      supabase
        .from('gift_cards')
        .select('amount')
        .gte('created_at', mtdStart)
        .lte('created_at', today + 'T23:59:59')
        .neq('status', 'pending'),
      // 30-day gift card sales trend
      supabase
        .from('gift_cards')
        .select('created_at, amount')
        .gte('created_at', thirtyDaysAgo)
        .lte('created_at', today + 'T23:59:59')
        .neq('status', 'pending')
        .order('created_at', { ascending: true }),
      // This week gift card sales
      supabase
        .from('gift_cards')
        .select('amount')
        .gte('created_at', thisWeekStart)
        .lte('created_at', today + 'T23:59:59')
        .neq('status', 'pending'),
      // Last week gift card sales
      supabase
        .from('gift_cards')
        .select('amount')
        .gte('created_at', lastWeekStart)
        .lte('created_at', lastWeekEnd + 'T23:59:59')
        .neq('status', 'pending'),
    ]);

    const todayPurchases = todayPurchasesRes.data || [];
    const mtdPurchases = mtdPurchasesRes.data || [];
    const activeSessions = activeSessionsRes.data || [];
    const trendPurchases = trendPurchasesRes.data || [];
    const thisWeekPurchases = thisWeekPurchasesRes.data || [];
    const lastWeekPurchases = lastWeekPurchasesRes.data || [];
    const todayGiftCards = todayGiftCardsRes.data || [];
    const mtdGiftCards = mtdGiftCardsRes.data || [];
    const trendGiftCards = trendGiftCardsRes.data || [];
    const thisWeekGiftCards = thisWeekGiftCardsRes.data || [];
    const lastWeekGiftCards = lastWeekGiftCardsRes.data || [];

    // Coerce NUMERIC fields - Supabase returns NUMERIC(10,2) as strings
    // Subtract gift card amount already counted when the gift card was sold
    const netPurchase = (p: { price: number | string; gift_card_amount_used?: number | string | null }) =>
      Math.max(0, Number(p.price) - Number(p.gift_card_amount_used || 0));

    const todayRevenue =
      todayPurchases.reduce((s, p) => s + netPurchase(p), 0) +
      todayGiftCards.reduce((s, g) => s + Number(g.amount), 0);
    const mtdRevenue =
      mtdPurchases.reduce((s, p) => s + netPurchase(p), 0) +
      mtdGiftCards.reduce((s, g) => s + Number(g.amount), 0);
    const thisWeekRevenue =
      thisWeekPurchases.reduce((s, p) => s + netPurchase(p), 0) +
      thisWeekGiftCards.reduce((s, g) => s + Number(g.amount), 0);
    const lastWeekRevenue =
      lastWeekPurchases.reduce((s, p) => s + netPurchase(p), 0) +
      lastWeekGiftCards.reduce((s, g) => s + Number(g.amount), 0);

    // Build 30-day trend (combine purchases + gift cards by date)
    const trendMap = new Map<string, number>();
    for (const p of trendPurchases) {
      const dateKey = p.purchase_date.slice(0, 10);
      trendMap.set(dateKey, (trendMap.get(dateKey) || 0) + netPurchase(p));
    }
    for (const g of trendGiftCards) {
      const dateKey = g.created_at.slice(0, 10);
      trendMap.set(dateKey, (trendMap.get(dateKey) || 0) + Number(g.amount));
    }

    // Fill all 30 days
    const trend: Array<{ date: string; revenue: number }> = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatDateET(d);
      trend.push({ date: key, revenue: trendMap.get(key) || 0 });
    }

    // Top product today
    const productCounts = new Map<string, number>();
    for (const p of todayPurchases) {
      productCounts.set(p.name, (productCounts.get(p.name) || 0) + 1);
    }
    let topProductToday: string | null = null;
    let maxCount = 0;
    for (const [name, count] of productCounts) {
      if (count > maxCount) {
        maxCount = count;
        topProductToday = name;
      }
    }

    // Busiest hour from today's purchases (Eastern Time)
    const hourCounts = new Map<number, number>();
    const etHourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    });
    for (const p of todayPurchases) {
      const date = new Date(p.purchase_date);
      if (!isNaN(date.getTime())) {
        const hourPart = etHourFormatter.formatToParts(date).find(pt => pt.type === 'hour');
        const hour = Number(hourPart?.value ?? 0);
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
    }
    let busiestHour: number | null = null;
    let maxHourCount = 0;
    for (const [hour, count] of hourCounts) {
      if (count > maxHourCount) {
        maxHourCount = count;
        busiestHour = hour;
      }
    }

    const result = {
      todayRevenue,
      mtdRevenue,
      activeSessions: activeSessions.length,
      totalCustomers: totalCustomersRes.count || 0,
      trend,
      thisWeekRevenue,
      lastWeekRevenue,
      topProductToday,
      busiestHour,
      newCustomersThisWeek: newCustomersRes.count || 0,
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch overview report');
    return NextResponse.json(
      { error: 'Failed to fetch overview report' },
      { status: 500 }
    );
  }
}
