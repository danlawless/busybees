/**
 * useReportData Hook
 * SWR-based hook for fetching report API data with typed responses
 */

'use client';

import useSWR from 'swr';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch report data');
    return res.json();
  });

interface DateRange {
  startDate: string;
  endDate: string;
}

interface UseReportDataOptions {
  dateRange?: DateRange;
  granularity?: 'daily' | 'weekly' | 'monthly';
  enabled?: boolean;
}

export function useReportData<T>(
  endpoint: string,
  options: UseReportDataOptions = {}
) {
  const { dateRange, granularity, enabled = true } = options;

  const params = new URLSearchParams();
  if (dateRange?.startDate) params.set('startDate', dateRange.startDate);
  if (dateRange?.endDate) params.set('endDate', dateRange.endDate);
  if (granularity) params.set('granularity', granularity);

  const queryString = params.toString();
  const url = `/api/admin/reports/${endpoint}${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<T>(
    enabled ? url : null,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
    }
  );

  return {
    data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

// Type definitions for each report endpoint response

export interface OverviewData {
  todayRevenue: number;
  mtdRevenue: number;
  activeSessions: number;
  totalCustomers: number;
  trend: Array<{ date: string; revenue: number }>;
  thisWeekRevenue: number;
  lastWeekRevenue: number;
  topProductToday: string | null;
  busiestHour: number | null;
  newCustomersThisWeek: number;
}

export interface RevenueData {
  timeSeries: Array<{
    date: string;
    dayPass: number;
    weeklyPass: number;
    monthlyPass: number;
    partyPackage: number;
    foodBeverage: number;
    giftCard: number;
    total: number;
  }>;
  breakdown: Array<{ name: string; value: number }>;
  avgTransactionValue: Array<{ date: string; value: number }>;
  currentPeriodTotal: number;
  previousPeriodTotal: number;
}

export interface CustomerData {
  growth: Array<{ date: string; total: number; new: number }>;
  visitFrequency: Array<{ visits: string; count: number }>;
  topCustomers: Array<{
    id: string;
    name: string;
    phone: string;
    totalSpend: number;
    visitCount: number;
  }>;
  ageDistribution: Array<{ age: string; count: number }>;
  totalCustomers: number;
  newVsReturning: Array<{ date: string; new: number; returning: number }>;
}

export interface PassData {
  activeByType: Array<{ name: string; value: number }>;
  salesTrend: Array<{ date: string; day: number; weekly: number; monthly: number }>;
  activeVsExpired: Array<{
    date: string;
    active: number;
    expired: number;
  }>;
  usageRates: Array<{ type: string; avgUsed: number; included: number; rate: number }>;
}

export interface PartyData {
  bookingsOverTime: Array<{ date: string; count: number }>;
  byStatus: Array<{ name: string; value: number }>;
  revenueByPackage: Array<{ name: string; value: number }>;
  dayOfWeek: Array<{ day: string; count: number }>;
  avgPartySize: Array<{ date: string; size: number }>;
  discountUsage: { total: number; withDiscount: number; avgDiscountPercent: number };
  upcomingParties: Array<{
    id: string;
    customerName: string;
    childName: string;
    partyDate: string;
    packageName: string;
    guestCount: number;
    totalPrice: number;
  }>;
}

export interface SessionData {
  dailyAttendance: Array<{ date: string; count: number }>;
  peakHours: Array<{ hour: number; day: number; count: number }>;
  avgDuration: Array<{ date: string; minutes: number }>;
  dayOfWeekPattern: Array<{ day: string; avgCount: number }>;
}

export interface MarketingData {
  giftCardSales: Array<{ date: string; sales: number; redemptions: number }>;
  outstandingBalance: number;
  giftCardStatus: Array<{ name: string; value: number }>;
  subscriberGrowth: Array<{ date: string; total: number }>;
  subscriberSources: Array<{ source: string; count: number }>;
  activePromos: Array<{
    id: string;
    name: string;
    discountPercent: number;
    startDate: string;
    endDate: string;
  }>;
}
