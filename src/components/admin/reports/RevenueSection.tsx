'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useReportData, type RevenueData } from '@/hooks/useReportData';
import { ReportChartCard } from './ReportChartCard';
import { ReportKpiCard } from './ReportKpiCard';
import { ReportDateRangePicker, type DateRange, getPresetRange } from './ReportDateRangePicker';
import {
  CHART_COLORS,
  SERIES_COLORS,
  TOOLTIP_STYLE,
  CHART_MARGIN,
  formatCurrency,
} from './chartTheme';

type Granularity = 'daily' | 'weekly' | 'monthly';

export function RevenueSection() {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('last30'));
  const [granularity, setGranularity] = useState<Granularity>('daily');

  const { data, isLoading } = useReportData<RevenueData>('revenue', {
    dateRange,
    granularity,
  });

  const periodChange =
    data && data.previousPeriodTotal > 0
      ? ((data.currentPeriodTotal - data.previousPeriodTotal) /
          data.previousPeriodTotal) *
        100
      : 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
        <div className="flex gap-1">
          {(['daily', 'weekly', 'monthly'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                granularity === g
                  ? 'bg-charcoal-800 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Period Comparison KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ReportKpiCard
          label="Current Period"
          value={data ? formatCurrency(data.currentPeriodTotal) : '--'}
          trend={data ? { value: periodChange, label: 'vs previous period' } : undefined}
          loading={isLoading}
        />
        <ReportKpiCard
          label="Previous Period"
          value={data ? formatCurrency(data.previousPeriodTotal) : '--'}
          loading={isLoading}
        />
        <ReportKpiCard
          label="Transactions"
          value={
            data
              ? data.timeSeries.reduce((s, d) => s + (d.total > 0 ? 1 : 0), 0) +
                ' days with sales'
              : '--'
          }
          loading={isLoading}
        />
      </div>

      {/* Revenue Time Series (Stacked Area) */}
      <ReportChartCard title="Revenue by Product Type" loading={isLoading}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.timeSeries || []} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Legend />
              <Area type="monotone" dataKey="dayPass" name="Day Pass" stackId="1" stroke={SERIES_COLORS[0]} fill={SERIES_COLORS[0]} fillOpacity={0.6} />
              <Area type="monotone" dataKey="weeklyPass" name="Weekly Pass" stackId="1" stroke={SERIES_COLORS[1]} fill={SERIES_COLORS[1]} fillOpacity={0.6} />
              <Area type="monotone" dataKey="monthlyPass" name="Monthly Pass" stackId="1" stroke={SERIES_COLORS[2]} fill={SERIES_COLORS[2]} fillOpacity={0.6} />
              <Area type="monotone" dataKey="partyPackage" name="Party Package" stackId="1" stroke={SERIES_COLORS[3]} fill={SERIES_COLORS[3]} fillOpacity={0.6} />
              <Area type="monotone" dataKey="foodBeverage" name="Food & Beverage" stackId="1" stroke={SERIES_COLORS[4]} fill={SERIES_COLORS[4]} fillOpacity={0.6} />
              <Area type="monotone" dataKey="giftCard" name="Gift Cards" stackId="1" stroke={SERIES_COLORS[5]} fill={SERIES_COLORS[5]} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ReportChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown Pie */}
        <ReportChartCard title="Revenue Breakdown" loading={isLoading}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.breakdown || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {(data?.breakdown || []).map((_, i) => (
                    <Cell
                      key={i}
                      fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>

        {/* Average Transaction Value */}
        <ReportChartCard title="Average Transaction Value" loading={isLoading}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.avgTransactionValue || []} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value: number) => [formatCurrency(value), 'Avg Transaction']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_COLORS.honey}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.honey, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
      </div>

      {/* Period Comparison Table */}
      {data && (
        <ReportChartCard title="Revenue by Type - Period Comparison">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 pr-4 font-medium text-neutral-600">Type</th>
                  <th className="text-right py-2 px-4 font-medium text-neutral-600">Revenue</th>
                  <th className="text-right py-2 pl-4 font-medium text-neutral-600">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {data.breakdown.map((item) => (
                  <tr key={item.name} className="border-b border-neutral-100">
                    <td className="py-2 pr-4 text-charcoal-800">{item.name}</td>
                    <td className="py-2 px-4 text-right font-medium">
                      {formatCurrency(item.value)}
                    </td>
                    <td className="py-2 pl-4 text-right text-neutral-500">
                      {data.currentPeriodTotal > 0
                        ? ((item.value / data.currentPeriodTotal) * 100).toFixed(1)
                        : '0'}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportChartCard>
      )}
    </div>
  );
}
