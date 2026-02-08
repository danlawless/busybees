/**
 * Shared aggregation logic used by all report API routes
 * Provides date utilities and common query patterns
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/database.types';

type AdminClient = SupabaseClient<Database>;

export interface DateRange {
  startDate: string;
  endDate: string;
}

export type Granularity = 'daily' | 'weekly' | 'monthly';

/**
 * Parse date range from query params with fallback to last 30 days
 */
export function parseDateRange(searchParams: URLSearchParams): DateRange {
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(now.getDate() - 30);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    startDate: searchParams.get('startDate') || fmt(defaultStart),
    endDate: searchParams.get('endDate') || fmt(now),
  };
}

export function parseGranularity(searchParams: URLSearchParams): Granularity {
  const g = searchParams.get('granularity');
  if (g === 'daily' || g === 'weekly' || g === 'monthly') return g;
  return 'daily';
}

/**
 * Get today's date formatted as YYYY-MM-DD in local timezone
 */
export function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get start of current week (Sunday)
 */
export function weekStartStr(): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get start of last week (Sunday)
 */
export function lastWeekStartStr(): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() - 7);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get start of last week end (Saturday)
 */
export function lastWeekEndStr(): string {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() - now.getDay() - 1);
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get start of current month
 */
export function monthStartStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * Get the date N days ago
 */
export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Group records by date bucket based on granularity
 */
export function bucketDate(dateStr: string, granularity: Granularity): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (granularity === 'daily') return dateStr;
  if (granularity === 'weekly') {
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  // monthly
  return dateStr.slice(0, 7);
}

/**
 * Fetch purchases within a date range
 */
export async function fetchPurchasesInRange(
  supabase: AdminClient,
  range: DateRange
) {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .gte('purchase_date', range.startDate)
    .lte('purchase_date', range.endDate + 'T23:59:59')
    .order('purchase_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch sessions within a date range
 */
export async function fetchSessionsInRange(
  supabase: AdminClient,
  range: DateRange
) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .gte('start_time', range.startDate)
    .lte('start_time', range.endDate + 'T23:59:59')
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch party bookings within a date range
 */
export async function fetchPartiesInRange(
  supabase: AdminClient,
  range: DateRange
) {
  const { data, error } = await supabase
    .from('party_bookings')
    .select('*')
    .gte('party_date', range.startDate)
    .lte('party_date', range.endDate)
    .order('party_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Map purchase type to a user-friendly label
 */
export function purchaseTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    day_pass: 'Day Pass',
    weekly_pass: 'Weekly Pass',
    monthly_pass: 'Monthly Pass',
    party_package: 'Party Package',
    food_beverage: 'Food & Beverage',
  };
  return labels[type] || type;
}

/**
 * Map day-of-week number (0=Sunday) to label
 */
export function dayOfWeekLabel(day: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] || '';
}
