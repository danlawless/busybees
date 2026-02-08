'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useReportData, type SessionData } from '@/hooks/useReportData';
import { ReportChartCard } from './ReportChartCard';
import { ReportDateRangePicker, type DateRange, getPresetRange } from './ReportDateRangePicker';
import {
  CHART_COLORS,
  TOOLTIP_STYLE,
  CHART_MARGIN,
} from './chartTheme';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am to 6pm
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function SessionSection() {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('last30'));

  const { data, isLoading } = useReportData<SessionData>('sessions', {
    dateRange,
  });

  // Build heatmap grid
  const heatmapData = HOURS.map((hour) => {
    const row: Record<string, number | string> = { hour: `${hour % 12 || 12}${hour >= 12 ? 'pm' : 'am'}` };
    for (let day = 0; day < 7; day++) {
      const match = data?.peakHours.find((p) => p.hour === hour && p.day === day);
      row[DAYS[day]] = match?.count || 0;
    }
    return row;
  });

  const maxHeatmapCount = data?.peakHours
    ? Math.max(...data.peakHours.map((p) => p.count), 1)
    : 1;

  const getHeatColor = (count: number) => {
    if (count === 0) return '#f5f5f5';
    const intensity = count / maxHeatmapCount;
    if (intensity < 0.25) return '#FFF3D0';
    if (intensity < 0.5) return '#FFE08A';
    if (intensity < 0.75) return '#FFC933';
    return '#FFB900';
  };

  return (
    <div className="space-y-6">
      <ReportDateRangePicker value={dateRange} onChange={setDateRange} />

      {/* Daily Attendance */}
      <ReportChartCard title="Daily Attendance" loading={isLoading}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.dailyAttendance || []} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" name="Sessions" fill={CHART_COLORS.honey} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportChartCard>

      {/* Peak Hours Heatmap */}
      <ReportChartCard title="Peak Hours Heatmap" subtitle="Hour of day vs day of week" loading={isLoading}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left py-1 pr-2 font-medium text-neutral-600">Time</th>
                {DAYS.map((day) => (
                  <th key={day} className="text-center py-1 px-2 font-medium text-neutral-600">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.map((row) => (
                <tr key={row.hour as string}>
                  <td className="py-1 pr-2 font-medium text-neutral-600">{row.hour as string}</td>
                  {DAYS.map((day) => {
                    const count = row[day] as number;
                    return (
                      <td key={day} className="py-1 px-1">
                        <div
                          className="rounded-md text-center py-2 text-xs font-medium"
                          style={{
                            backgroundColor: getHeatColor(count),
                            color: count > maxHeatmapCount * 0.5 ? '#2B2B2B' : '#737373',
                          }}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avg Duration */}
        <ReportChartCard title="Average Session Duration" loading={isLoading}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.avgDuration || []} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}m`} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value: number) => [`${value} min`, 'Avg Duration']}
                />
                <Line
                  type="monotone"
                  dataKey="minutes"
                  stroke={CHART_COLORS.blue}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.blue, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>

        {/* Day of Week Patterns */}
        <ReportChartCard title="Avg Attendance by Day of Week" loading={isLoading}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.dayOfWeekPattern || []} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="avgCount" name="Avg Sessions" fill={CHART_COLORS.mint} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
      </div>
    </div>
  );
}
