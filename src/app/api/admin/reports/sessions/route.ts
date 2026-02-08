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
} from '@/lib/services/report-aggregations';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const range = parseDateRange(searchParams);
    const granularity = parseGranularity(searchParams);

    const { data: sessionsData, error } = await supabase
      .from('sessions')
      .select('*')
      .gte('start_time', range.startDate)
      .lte('start_time', range.endDate + 'T23:59:59')
      .order('start_time', { ascending: true });

    if (error) throw error;
    const sessions = sessionsData || [];

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

    // Peak hours heatmap (hour vs day-of-week)
    const peakHoursMap = new Map<string, number>();
    for (const s of sessions) {
      const d = new Date(s.start_time);
      if (isNaN(d.getTime())) continue;
      const hour = d.getHours();
      const day = d.getDay();
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
