'use client';

import { motion } from 'framer-motion';

interface ReportKpiCardProps {
  label: string;
  value: string | number;
  trend?: { value: number; label: string };
  icon?: string;
  loading?: boolean;
}

export function ReportKpiCard({ label, value, trend, icon, loading }: ReportKpiCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-soft border border-primary-200/20 p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-neutral-200 rounded w-2/3" />
          <div className="h-8 bg-neutral-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  const trendColor =
    trend && trend.value > 0
      ? 'text-green-600'
      : trend && trend.value < 0
        ? 'text-red-600'
        : 'text-neutral-500';

  const trendArrow =
    trend && trend.value > 0 ? '\u2191' : trend && trend.value < 0 ? '\u2193' : '';

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-soft border border-primary-200/20 p-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-charcoal-800">{value}</p>
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      {trend && (
        <p className={`text-xs mt-2 ${trendColor}`}>
          {trendArrow} {Math.abs(trend.value).toFixed(1)}% {trend.label}
        </p>
      )}
    </motion.div>
  );
}
