'use client';

import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useReportData, type PassData } from '@/hooks/useReportData';
import { ReportChartCard } from './ReportChartCard';
import { ReportDateRangePicker, type DateRange, getPresetRange } from './ReportDateRangePicker';
import {
  CHART_COLORS,
  SERIES_COLORS,
  TOOLTIP_STYLE,
  CHART_MARGIN,
} from './chartTheme';

export function PassSection() {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('last90'));

  const { data, isLoading } = useReportData<PassData>('passes', {
    dateRange,
    granularity: 'weekly',
  });

  return (
    <div className="space-y-6">
      <ReportDateRangePicker value={dateRange} onChange={setDateRange} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Passes Donut */}
        <ReportChartCard title="Active Passes by Type" loading={isLoading}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.activeByType || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {(data?.activeByType || []).map((_, i) => (
                    <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>

        {/* Usage Rates */}
        <ReportChartCard title="Pass Usage Rates" loading={isLoading}>
          {data?.usageRates && data.usageRates.length > 0 ? (
            <div className="space-y-4">
              {data.usageRates.map((rate) => (
                <div key={rate.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-charcoal-800">{rate.type}</span>
                    <span className="text-sm text-neutral-500">
                      {rate.avgUsed} / {rate.included} sessions ({rate.rate}%)
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-3">
                    <div
                      className="bg-honey-500 rounded-full h-3 transition-all"
                      style={{ width: `${Math.min(rate.rate, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500 text-sm py-8 text-center">No usage data available</p>
          )}
        </ReportChartCard>
      </div>

      {/* Pass Sales Trend */}
      <ReportChartCard title="Pass Sales Trend" loading={isLoading}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.salesTrend || []} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend />
              <Line type="monotone" dataKey="day" name="Day Pass" stroke={SERIES_COLORS[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="weekly" name="Weekly Pass" stroke={SERIES_COLORS[1]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="monthly" name="Monthly Pass" stroke={SERIES_COLORS[2]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ReportChartCard>

      {/* Active vs Expired */}
      <ReportChartCard title="Active vs Expired Passes" loading={isLoading}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.activeVsExpired || []} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend />
              <Bar dataKey="active" name="Active" stackId="a" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expired" name="Expired" stackId="a" fill={CHART_COLORS.gray} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportChartCard>
    </div>
  );
}
