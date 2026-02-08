'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useReportData, type OverviewData } from '@/hooks/useReportData';
import { ReportKpiCard } from './ReportKpiCard';
import { ReportChartCard } from './ReportChartCard';
import { CHART_COLORS, TOOLTIP_STYLE, CHART_MARGIN, formatCurrency } from './chartTheme';

export function OverviewSection() {
  const { data, isLoading } = useReportData<OverviewData>('overview');

  const weekChange =
    data && data.lastWeekRevenue > 0
      ? ((data.thisWeekRevenue - data.lastWeekRevenue) / data.lastWeekRevenue) * 100
      : 0;

  const formatHour = (hour: number | null) => {
    if (hour === null) return 'N/A';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard
          label="Today's Revenue"
          value={data ? formatCurrency(data.todayRevenue) : '--'}
          icon="💰"
          loading={isLoading}
        />
        <ReportKpiCard
          label="Month-to-Date Revenue"
          value={data ? formatCurrency(data.mtdRevenue) : '--'}
          icon="📈"
          loading={isLoading}
        />
        <ReportKpiCard
          label="Active Sessions"
          value={data?.activeSessions ?? '--'}
          icon="🎮"
          loading={isLoading}
        />
        <ReportKpiCard
          label="Total Customers"
          value={data?.totalCustomers ?? '--'}
          icon="👥"
          loading={isLoading}
        />
      </div>

      {/* 30-day Revenue Trend */}
      <ReportChartCard title="30-Day Revenue Trend" loading={isLoading}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.trend || []} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id="honeyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.honey} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.honey} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `$${v}`}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={CHART_COLORS.honey}
                strokeWidth={2}
                fill="url(#honeyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ReportChartCard>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard
          label="This Week Revenue"
          value={data ? formatCurrency(data.thisWeekRevenue) : '--'}
          trend={
            data
              ? { value: weekChange, label: 'vs last week' }
              : undefined
          }
          loading={isLoading}
        />
        <ReportKpiCard
          label="Last Week Revenue"
          value={data ? formatCurrency(data.lastWeekRevenue) : '--'}
          loading={isLoading}
        />
        <ReportKpiCard
          label="Top Product Today"
          value={data?.topProductToday || 'None yet'}
          icon="⭐"
          loading={isLoading}
        />
        <ReportKpiCard
          label="Busiest Hour"
          value={data ? formatHour(data.busiestHour) : '--'}
          icon="🕐"
          loading={isLoading}
        />
      </div>

      <ReportKpiCard
        label="New Customers This Week"
        value={data?.newCustomersThisWeek ?? '--'}
        icon="✨"
        loading={isLoading}
      />
    </div>
  );
}
