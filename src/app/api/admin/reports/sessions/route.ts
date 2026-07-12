/**
 * API Route: Admin Reports - Attendance/Session Analytics
 * Daily attendance, peak hours, duration trends
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  parseDateRange,
  parseGranularity,
  bucketDate,
  dayOfWeekLabel,
  fetchSessionsInRange,
} from '@/lib/services/report-aggregations';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const range = parseDateRange(searchParams);
    const granularity = parseGranularity(searchParams);

    const sessions = await fetchSessionsInRange(supabase, range);

    // Daily attendance
    const attendanceMap = new Map<string, number>();
    for (const s of sessions) {
      const dateKey = s.start_time.slice(0, 10);
      const bucket = bucketDate(dateKey, granularity);
      attendanceMap.set(bucket, (attendanceMap.get(bucket) || 0) + 1);
    }
    const dailyAttendance = Array.from(attendanceMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Peak hours heatmap (hour vs day-of-week) in Eastern Time
    const peakHoursMap = new Map<string, number>();
    const easternFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
      weekday: 'short',
    });
    for (const s of sessions) {
      const d = new Date(s.start_time);
      if (isNaN(d.getTime())) continue;
      const parts = easternFormatter.formatToParts(d);
      const hour = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
      const dayName = parts.find(p => p.type === 'weekday')?.value ?? '';
      const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const day = dayMap[dayName] ?? d.getDay();
      const key = `${hour}-${day}`;
      peakHoursMap.set(key, (peakHoursMap.get(key) || 0) + 1);
    }
    const peakHours = Array.from(peakHoursMap.entries()).map(([key, count]) => {
      const [hour, day] = key.split('-').map(Number);
      return { hour, day, count };
    });

    // Average session duration trend
    const durationMap = new Map<
      string,
      { totalMinutes: number; count: number }
    >();
    for (const s of sessions) {
      if (s.duration != null) {
        const dateKey = s.start_time.slice(0, 10);
        const bucket = bucketDate(dateKey, granularity);
        const entry = durationMap.get(bucket) || {
          totalMinutes: 0,
          count: 0,
        };
        entry.totalMinutes += s.duration;
        entry.count += 1;
        durationMap.set(bucket, entry);
      }
    }
    const avgDuration = Array.from(durationMap.entries())
      .map(([date, d]) => ({
        date,
        minutes: d.count > 0 ? Math.round(d.totalMinutes / d.count) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Day-of-week patterns (average attendance by day)
    const dowData: Array<{ totalCount: number; days: number }> = Array.from(
      { length: 7 },
      () => ({ totalCount: 0, days: 0 })
    );
    const dowDates = new Map<number, Set<string>>();
    for (const s of sessions) {
      const d = new Date(s.start_time);
      if (isNaN(d.getTime())) continue;
      const day = d.getDay();
      const dateKey = s.start_time.slice(0, 10);
      if (!dowDates.has(day)) dowDates.set(day, new Set());
      dowDates.get(day)!.add(dateKey);
      dowData[day].totalCount += 1;
    }
    for (const [day, dates] of dowDates) {
      dowData[day].days = dates.size;
    }
    const dayOfWeekPattern = dowData.map((d, i) => ({
      day: dayOfWeekLabel(i),
      avgCount: d.days > 0 ? Math.round(d.totalCount / d.days) : 0,
    }));

    return NextResponse.json({
      dailyAttendance,
      peakHours,
      avgDuration,
      dayOfWeekPattern,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch sessions report');
    return NextResponse.json(
      { error: 'Failed to fetch sessions report' },
      { status: 500 }
    );
  }
}
