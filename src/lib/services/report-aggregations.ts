/**
 * Shared aggregation logic used by all report API routes
 * Provides date utilities and common query patterns
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/database.types';

type AdminClient = SupabaseClient<Database>;

const TIMEZONE = 'America/New_York';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export type Granularity = 'daily' | 'weekly' | 'monthly';

/**
 * Get current date/time parts in Eastern Time
 */
export function easternNow(): { year: number; month: number; day: number; hour: number; minute: number; dayOfWeek: number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    dayOfWeek: dayMap[get('weekday')] ?? 0,
  };
}

/**
 * Format a Date object as YYYY-MM-DD in Eastern Time
 */
export function formatDateET(d: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE });
  return formatter.format(d);
}

/**
 * Parse date range from query params with fallback to last 30 days
 */
export function parseDateRange(searchParams: URLSearchParams): DateRange {
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(now.getDate() - 30);

  return {
    startDate: searchParams.get('startDate') || formatDateET(defaultStart),
    endDate: searchParams.get('endDate') || formatDateET(now),
  };
}

export function parseGranularity(searchParams: URLSearchParams): Granularity {
  const g = searchParams.get('granularity');
  if (g === 'daily' || g === 'weekly' || g === 'monthly') return g;
  return 'daily';
}

/**
 * Get today's date formatted as YYYY-MM-DD in Eastern Time
 */
export function todayStr(): string {
  return formatDateET(new Date());
}

/**
 * Get start of current week (Sunday) in Eastern Time
 */
export function weekStartStr(): string {
  const { dayOfWeek } = easternNow();
  const start = new Date();
  start.setDate(start.getDate() - dayOfWeek);
  return formatDateET(start);
}

/**
 * Get start of last week (Sunday) in Eastern Time
 */
export function lastWeekStartStr(): string {
  const { dayOfWeek } = easternNow();
  const start = new Date();
  start.setDate(start.getDate() - dayOfWeek - 7);
  return formatDateET(start);
}

/**
 * Get start of last week end (Saturday) in Eastern Time
 */
export function lastWeekEndStr(): string {
  const { dayOfWeek } = easternNow();
  const end = new Date();
  end.setDate(end.getDate() - dayOfWeek - 1);
  return formatDateET(end);
}

/**
 * Get start of current month in Eastern Time
 */
export function monthStartStr(): string {
  const { year, month } = easternNow();
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/**
 * Get the date N days ago in Eastern Time
 */
export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatDateET(d);
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
    after_dark: 'After Dark',
  };
  return labels[type] || type;
}

/**
 * Map day-of-week number (0=Sunday) to label
 */
export function dayOfWeekLabel(day: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] || '';
}
