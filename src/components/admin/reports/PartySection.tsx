'use client';

import { useState } from 'react';
import {
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
  ResponsiveContainer,
} from 'recharts';
import { useReportData, type PartyData } from '@/hooks/useReportData';
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

const STATUS_COLORS: Record<string, string> = {
  Pending: CHART_COLORS.pending,
  Confirmed: CHART_COLORS.confirmed,
  Cancelled: CHART_COLORS.cancelled,
  Done: CHART_COLORS.done,
};

export function PartySection() {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('last90'));

  const { data, isLoading } = useReportData<PartyData>('parties', {
    dateRange,
    granularity: 'monthly',
  });

  return (
    <div className="space-y-6">
      <ReportDateRangePicker value={dateRange} onChange={setDateRange} />

      {/* Discount stats */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ReportKpiCard
            label="Total Bookings"
            value={data.discountUsage.total}
            icon="🎂"
          />
          <ReportKpiCard
            label="With Discounts"
            value={data.discountUsage.withDiscount}
            icon="🏷️"
          />
          <ReportKpiCard
            label="Avg Discount %"
            value={`${data.discountUsage.avgDiscountPercent}%`}
            icon="💸"
          />
        </div>
      )}

      {/* Bookings Over Time */}
      <ReportChartCard title="Bookings Over Time" loading={isLoading}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.bookingsOverTime || []} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" name="Bookings" fill={CHART_COLORS.honey} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status Donut */}
        <ReportChartCard title="Bookings by Status" loading={isLoading}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.byStatus || []}
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
                  {(data?.byStatus || []).map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || SERIES_COLORS[i % SERIES_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>

        {/* Revenue by Package */}
        <ReportChartCard title="Revenue by Package" loading={isLoading}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.revenueByPackage || []} margin={CHART_MARGIN} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                <Bar dataKey="value" fill={CHART_COLORS.purple} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day of Week */}
        <ReportChartCard title="Day-of-Week Popularity" loading={isLoading}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.dayOfWeek || []} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Bookings" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>

        {/* Average Party Size */}
        <ReportChartCard title="Average Party Size Trend" loading={isLoading}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.avgPartySize || []} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(value: number) => [`${value} guests`, 'Avg Size']} />
                <Line type="monotone" dataKey="size" stroke={CHART_COLORS.coral} strokeWidth={2} dot={{ fill: CHART_COLORS.coral, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
      </div>

      {/* Upcoming Parties */}
      {data && data.upcomingParties.length > 0 && (
        <ReportChartCard title="Upcoming Confirmed Parties">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 pr-4 font-medium text-neutral-600">Date</th>
                  <th className="text-left py-2 pr-4 font-medium text-neutral-600">Customer</th>
                  <th className="text-left py-2 pr-4 font-medium text-neutral-600">Child</th>
                  <th className="text-left py-2 pr-4 font-medium text-neutral-600">Package</th>
                  <th className="text-right py-2 px-4 font-medium text-neutral-600">Guests</th>
                  <th className="text-right py-2 pl-4 font-medium text-neutral-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.upcomingParties.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-100">
                    <td className="py-2 pr-4 text-charcoal-800">{p.partyDate}</td>
                    <td className="py-2 pr-4">{p.customerName}</td>
                    <td className="py-2 pr-4">{p.childName}</td>
                    <td className="py-2 pr-4">{p.packageName}</td>
                    <td className="py-2 px-4 text-right">{p.guestCount}</td>
                    <td className="py-2 pl-4 text-right font-medium text-honey-600">
                      {formatCurrency(p.totalPrice)}
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
