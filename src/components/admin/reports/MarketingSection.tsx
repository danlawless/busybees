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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useReportData, type MarketingData } from '@/hooks/useReportData';
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

export function MarketingSection() {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('last90'));

  const { data, isLoading } = useReportData<MarketingData>('marketing', {
    dateRange,
    granularity: 'weekly',
  });

  return (
    <div className="space-y-6">
      <ReportDateRangePicker value={dateRange} onChange={setDateRange} />

      {/* Outstanding Balance KPI */}
      <ReportKpiCard
        label="Outstanding Gift Card Balance"
        value={data ? formatCurrency(data.outstandingBalance) : '--'}
        icon="🎁"
        loading={isLoading}
      />

      {/* Gift Card Sales & Redemptions */}
      <ReportChartCard title="Gift Card Sales vs Redemptions" loading={isLoading}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.giftCardSales || []} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Legend />
              <Bar dataKey="sales" name="Sales" fill={CHART_COLORS.honey} radius={[4, 4, 0, 0]} />
              <Bar dataKey="redemptions" name="Redemptions" fill={CHART_COLORS.coral} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gift Card Status Donut */}
        <ReportChartCard title="Gift Card Status" loading={isLoading}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.giftCardStatus || []}
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
                  {(data?.giftCardStatus || []).map((_, i) => (
                    <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>

        {/* Subscriber Source Breakdown */}
        <ReportChartCard title="Newsletter Subscriber Sources" loading={isLoading}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.subscriberSources || []} margin={CHART_MARGIN} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="source" tick={{ fontSize: 11 }} width={100} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Subscribers" fill={CHART_COLORS.mint} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
      </div>

      {/* Newsletter Subscriber Growth */}
      <ReportChartCard title="Newsletter Subscriber Growth" loading={isLoading}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.subscriberGrowth || []} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Subscribers"
                stroke={CHART_COLORS.blue}
                strokeWidth={2}
                fill="url(#subGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ReportChartCard>

      {/* Active Promos */}
      {data && data.activePromos.length > 0 && (
        <ReportChartCard title="Active Promotions">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 pr-4 font-medium text-neutral-600">Name</th>
                  <th className="text-right py-2 px-4 font-medium text-neutral-600">Discount</th>
                  <th className="text-left py-2 px-4 font-medium text-neutral-600">Start</th>
                  <th className="text-left py-2 pl-4 font-medium text-neutral-600">End</th>
                </tr>
              </thead>
              <tbody>
                {data.activePromos.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-100">
                    <td className="py-2 pr-4 text-charcoal-800 font-medium">{p.name}</td>
                    <td className="py-2 px-4 text-right text-honey-600 font-medium">
                      {p.discountPercent}%
                    </td>
                    <td className="py-2 px-4 text-neutral-500">{p.startDate}</td>
                    <td className="py-2 pl-4 text-neutral-500">{p.endDate}</td>
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
