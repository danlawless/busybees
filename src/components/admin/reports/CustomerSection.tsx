'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useReportData, type CustomerData } from '@/hooks/useReportData';
import { ReportChartCard } from './ReportChartCard';
import { ReportKpiCard } from './ReportKpiCard';
import { ReportDateRangePicker, type DateRange, getPresetRange } from './ReportDateRangePicker';
import {
  CHART_COLORS,
  TOOLTIP_STYLE,
  CHART_MARGIN,
  formatCurrency,
} from './chartTheme';

export function CustomerSection() {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('last90'));

  const { data, isLoading } = useReportData<CustomerData>('customers', {
    dateRange,
    granularity: 'weekly',
  });

  return (
    <div className="space-y-6">
      <ReportDateRangePicker value={dateRange} onChange={setDateRange} />

      <ReportKpiCard
        label="Total Customers"
        value={data?.totalCustomers ?? '--'}
        icon="👥"
        loading={isLoading}
      />

      {/* Customer Growth */}
      <ReportChartCard title="Customer Growth" loading={isLoading}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.growth || []} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.mint} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.mint} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Customers"
                stroke={CHART_COLORS.mint}
                strokeWidth={2}
                fill="url(#growthGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ReportChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New vs Returning */}
        <ReportChartCard title="New vs Returning Visitors" loading={isLoading}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.newVsReturning || []} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend />
                <Bar dataKey="new" name="New" fill={CHART_COLORS.honey} radius={[4, 4, 0, 0]} />
                <Bar dataKey="returning" name="Returning" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>

        {/* Visit Frequency */}
        <ReportChartCard title="Visit Frequency Distribution" loading={isLoading}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.visitFrequency || []} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
                <XAxis dataKey="visits" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Customers" fill={CHART_COLORS.purple} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
      </div>

      {/* Age Distribution */}
      <ReportChartCard title="Children Age Distribution" loading={isLoading}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.ageDistribution || []} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" name="Children" fill={CHART_COLORS.coral} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportChartCard>

      {/* Top Customers Table */}
      {data && data.topCustomers.length > 0 && (
        <ReportChartCard title="Top Customers by Spend">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 pr-4 font-medium text-neutral-600">#</th>
                  <th className="text-left py-2 pr-4 font-medium text-neutral-600">Name</th>
                  <th className="text-left py-2 pr-4 font-medium text-neutral-600">Phone</th>
                  <th className="text-right py-2 px-4 font-medium text-neutral-600">Total Spend</th>
                  <th className="text-right py-2 pl-4 font-medium text-neutral-600">Visits</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((c, i) => (
                  <tr key={c.id} className="border-b border-neutral-100">
                    <td className="py-2 pr-4 text-neutral-500">{i + 1}</td>
                    <td className="py-2 pr-4 text-charcoal-800 font-medium">{c.name}</td>
                    <td className="py-2 pr-4 text-neutral-500">{c.phone}</td>
                    <td className="py-2 px-4 text-right font-medium text-honey-600">
                      {formatCurrency(c.totalSpend)}
                    </td>
                    <td className="py-2 pl-4 text-right">{c.visitCount}</td>
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
