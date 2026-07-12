/**
 * API Route: Admin Reports - Revenue Forecast & Projections
 * Calculates 30/60/90 day revenue projections, monthly history, and seasonal trends
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { formatDateET, easternNow, fetchAllRows } from '@/lib/services/report-aggregations';

function formatDate(d: Date): string {
  return formatDateET(d);
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function monthsBetween(months: number): { start: string; end: string } {
  const et = easternNow();
  const start = new Date(et.year, et.month - 1 - months, 1);
  const end = new Date(et.year, et.month, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const today = formatDate(new Date());
    const future30 = futureDate(30);
    const future60 = futureDate(60);
    const future90 = futureDate(90);

    // Fetch everything in parallel
    const [
      expenses,
      futureBookings,
      activeSubscriptions,
      historicalPurchases,
      historicalParties,
      historicalGiftCards,
      prevYearPurchases,
      prevYearParties,
      prevYearGiftCards,
    ] = await Promise.all([
      // Active fixed expenses
      fetchAllRows((from, to) =>
        supabase
          .from('fixed_expenses')
          .select('*')
          .lte('effective_from', today)
          .or(`effective_to.is.null,effective_to.gte.${today}`)
          .range(from, to)
      ),

      // Confirmed future party bookings (next 90 days)
      fetchAllRows((from, to) =>
        supabase
          .from('party_bookings')
          .select('party_date, total_price, discount_amount, package_name, status')
          .gte('party_date', today)
          .lte('party_date', future90)
          .in('status', ['confirmed', 'pending'])
          .range(from, to)
      ),

      // Active auto-renewing memberships
      fetchAllRows((from, to) =>
        supabase
          .from('purchases')
          .select('price, type, purchase_date')
          .eq('type', 'monthly_pass')
          .eq('status', 'active')
          .range(from, to)
      ),

      // Historical purchases (last 12 months)
      fetchAllRows((from, to) =>
        supabase
          .from('purchases')
          .select('purchase_date, price, type')
          .gte('purchase_date', monthsBetween(12).start)
          .lte('purchase_date', today + 'T23:59:59')
          .order('purchase_date', { ascending: true })
          .range(from, to)
      ),

      // Historical party bookings (last 12 months)
      fetchAllRows((from, to) =>
        supabase
          .from('party_bookings')
          .select('party_date, total_price, discount_amount, status')
          .gte('party_date', monthsBetween(12).start)
          .lte('party_date', today)
          .in('status', ['confirmed', 'done'])
          .range(from, to)
      ),

      // Historical gift card sales (last 12 months)
      fetchAllRows((from, to) =>
        supabase
          .from('gift_cards')
          .select('created_at, amount')
          .gte('created_at', monthsBetween(12).start)
          .lte('created_at', today + 'T23:59:59')
          .neq('status', 'pending')
          .range(from, to)
      ),

      // Previous year purchases (for seasonal comparison)
      fetchAllRows((from, to) =>
        supabase
          .from('purchases')
          .select('purchase_date, price, type')
          .gte('purchase_date', monthsBetween(24).start)
          .lt('purchase_date', monthsBetween(12).start)
          .order('purchase_date', { ascending: true })
          .range(from, to)
      ),

      // Previous year parties
      fetchAllRows((from, to) =>
        supabase
          .from('party_bookings')
          .select('party_date, total_price, discount_amount, status')
          .gte('party_date', monthsBetween(24).start)
          .lt('party_date', monthsBetween(12).start)
          .in('status', ['confirmed', 'done'])
          .range(from, to)
      ),

      // Previous year gift cards
      fetchAllRows((from, to) =>
        supabase
          .from('gift_cards')
          .select('created_at, amount')
          .gte('created_at', monthsBetween(24).start)
          .lt('created_at', monthsBetween(12).start)
          .neq('status', 'pending')
          .range(from, to)
      ),
    ]);

    // --- Fixed Expenses ---
    const monthlyFixedExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const expenseBreakdown = expenses.map(e => ({
      category: e.category,
      name: e.name,
      amount: Number(e.amount),
    }));

    // Group expenses by category for summary
    const expenseByCategory: Record<string, number> = {};
    expenses.forEach(e => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + Number(e.amount);
    });

    // --- Revenue Projections (30/60/90 days) ---
    const monthlySubscriptionRevenue = activeSubscriptions.reduce((sum, s) => sum + Number(s.price), 0);

    const projections = [30, 60, 90].map(days => {
      const windowEnd = futureDate(days);

      // Confirmed party revenue in this window
      const confirmedRevenue = futureBookings
        .filter(b => b.party_date <= windowEnd)
        .reduce((sum, b) => sum + Number(b.total_price) - Number(b.discount_amount || 0), 0);

      // Projected subscription revenue (monthly subscriptions * months in window)
      const months = days / 30;
      const projectedSubscriptionRevenue = Math.round(monthlySubscriptionRevenue * months * 100) / 100;

      // Total fixed expenses for the window
      const totalFixedExpenses = Math.round(monthlyFixedExpenses * months * 100) / 100;

      const totalProjectedRevenue = confirmedRevenue + projectedSubscriptionRevenue;

      return {
        window: `${days}d` as '30d' | '60d' | '90d',
        confirmedRevenue: Math.round(confirmedRevenue * 100) / 100,
        projectedSubscriptionRevenue,
        totalProjectedRevenue: Math.round(totalProjectedRevenue * 100) / 100,
        totalFixedExpenses,
        netProjection: Math.round((totalProjectedRevenue - totalFixedExpenses) * 100) / 100,
      };
    });

    // --- Monthly History (last 12 months) ---
    // Build month buckets
    const monthBuckets: Record<string, {
      revenue: number;
      partyRevenue: number;
      passRevenue: number;
      foodRevenue: number;
      giftCardRevenue: number;
    }> = {};

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthBuckets[key] = { revenue: 0, partyRevenue: 0, passRevenue: 0, foodRevenue: 0, giftCardRevenue: 0 };
    }

    // Fill in purchases
    historicalPurchases.forEach(p => {
      const month = getMonthKey(p.purchase_date);
      if (monthBuckets[month]) {
        const amount = Number(p.price);
        monthBuckets[month].revenue += amount;
        if (p.type === 'party_package') {
          monthBuckets[month].partyRevenue += amount;
        } else if (['day_pass', 'weekly_pass', 'monthly_pass'].includes(p.type)) {
          monthBuckets[month].passRevenue += amount;
        } else if (p.type === 'food_beverage') {
          monthBuckets[month].foodRevenue += amount;
        }
      }
    });

    // Add party booking revenue (not in purchases table)
    historicalParties.forEach(p => {
      const month = getMonthKey(p.party_date);
      if (monthBuckets[month]) {
        const amount = Number(p.total_price) - Number(p.discount_amount || 0);
        monthBuckets[month].revenue += amount;
        monthBuckets[month].partyRevenue += amount;
      }
    });

    // Add gift card revenue
    historicalGiftCards.forEach(gc => {
      const month = getMonthKey(gc.created_at);
      if (monthBuckets[month]) {
        const amount = Number(gc.amount);
        monthBuckets[month].revenue += amount;
        monthBuckets[month].giftCardRevenue += amount;
      }
    });

    const monthlyHistory = Object.entries(monthBuckets).map(([month, data]) => ({
      month,
      revenue: Math.round(data.revenue * 100) / 100,
      expenses: monthlyFixedExpenses,
      net: Math.round((data.revenue - monthlyFixedExpenses) * 100) / 100,
      partyRevenue: Math.round(data.partyRevenue * 100) / 100,
      passRevenue: Math.round(data.passRevenue * 100) / 100,
      foodRevenue: Math.round(data.foodRevenue * 100) / 100,
      giftCardRevenue: Math.round(data.giftCardRevenue * 100) / 100,
    }));

    // --- Seasonal Comparison (current vs previous year) ---

    // Build previous year month buckets
    const prevYearBuckets: Record<string, number> = {};
    prevYearPurchases.forEach(p => {
      const month = getMonthKey(p.purchase_date);
      prevYearBuckets[month] = (prevYearBuckets[month] || 0) + Number(p.price);
    });
    prevYearParties.forEach(p => {
      const month = getMonthKey(p.party_date);
      prevYearBuckets[month] = (prevYearBuckets[month] || 0) + Number(p.total_price) - Number(p.discount_amount || 0);
    });
    prevYearGiftCards.forEach(gc => {
      const month = getMonthKey(gc.created_at);
      prevYearBuckets[month] = (prevYearBuckets[month] || 0) + Number(gc.amount);
    });

    // Map previous year months to current year for comparison
    const seasonalComparison = Object.entries(monthBuckets).map(([month, data]) => {
      const [year, m] = month.split('-');
      const prevMonth = `${Number(year) - 1}-${m}`;
      const previousYear = prevYearBuckets[prevMonth] || 0;
      const currentYear = data.revenue;
      const change = previousYear > 0
        ? Math.round(((currentYear - previousYear) / previousYear) * 1000) / 10
        : currentYear > 0 ? 100 : 0;

      return {
        month,
        currentYear: Math.round(currentYear * 100) / 100,
        previousYear: Math.round(previousYear * 100) / 100,
        change,
      };
    });

    // --- Break-even analysis ---
    const avgMonthlyRevenue = monthlyHistory.reduce((sum, m) => sum + m.revenue, 0) / Math.max(monthlyHistory.length, 1);
    const breakEvenPoint = monthlyFixedExpenses;
    const avgPartyRevenue = monthlyHistory.reduce((sum, m) => sum + m.partyRevenue, 0) / Math.max(monthlyHistory.length, 1);
    const avgPartiesPerMonth = historicalParties.length / 12;
    const revenuePerParty = avgPartiesPerMonth > 0 ? avgPartyRevenue / avgPartiesPerMonth : 0;
    const partiesNeededForBreakEven = revenuePerParty > 0 ? Math.ceil(breakEvenPoint / revenuePerParty) : 0;

    return NextResponse.json({
      monthlyFixedExpenses,
      expenseBreakdown,
      expenseByCategory,
      projections,
      monthlyHistory,
      seasonalComparison,
      breakEven: {
        monthlyExpenses: monthlyFixedExpenses,
        avgMonthlyRevenue: Math.round(avgMonthlyRevenue * 100) / 100,
        revenuePerParty: Math.round(revenuePerParty * 100) / 100,
        partiesNeededForBreakEven,
        activeSubscriptions: activeSubscriptions.length,
        monthlySubscriptionRevenue: Math.round(monthlySubscriptionRevenue * 100) / 100,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Forecast report error');
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
