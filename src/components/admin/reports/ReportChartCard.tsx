'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ReportChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  controls?: ReactNode;
  loading?: boolean;
  className?: string;
}

export function ReportChartCard({
  title,
  subtitle,
  children,
  controls,
  loading,
  className = '',
}: ReportChartCardProps) {
  return (
    <motion.div
      className={`bg-white rounded-2xl shadow-soft border border-primary-200/20 p-5 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-charcoal-800">{title}</h3>
          {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
        {controls && <div className="flex items-center gap-2">{controls}</div>}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey-500" />
        </div>
      ) : (
        children
      )}
    </motion.div>
  );
}
