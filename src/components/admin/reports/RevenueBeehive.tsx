'use client';

import { motion } from 'framer-motion';
import { formatCurrency } from './chartTheme';

interface Milestone {
  name: string;
  amount: number;
  cumulativeAmount: number;
  percentage: number;
  reached: boolean;
}

interface RevenueBeehiveProps {
  currentRevenue: number;
  expenses: Array<{ category: string; name: string; amount: number }>;
  loading?: boolean;
}

export function RevenueBeehive({ currentRevenue, expenses, loading }: RevenueBeehiveProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-soft border border-primary-200/20 p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-neutral-200 rounded w-1/3" />
          <div className="h-64 bg-neutral-100 rounded-xl" />
        </div>
      </div>
    );
  }

  // Sort expenses smallest to largest for milestone progression
  const sortedExpenses = [...expenses].sort((a, b) => a.amount - b.amount);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Build cumulative milestones
  let cumulative = 0;
  const milestones: Milestone[] = sortedExpenses.map(e => {
    cumulative += e.amount;
    return {
      name: e.name,
      amount: e.amount,
      cumulativeAmount: cumulative,
      percentage: totalExpenses > 0 ? (cumulative / totalExpenses) * 100 : 0,
      reached: currentRevenue >= cumulative,
    };
  });

  const fillPercentage = totalExpenses > 0
    ? Math.min((currentRevenue / totalExpenses) * 100, 100)
    : 0;

  const overTarget = currentRevenue > totalExpenses;

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-primary-200/20 p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-base font-semibold text-charcoal-800">Monthly Revenue Goal</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Current month progress toward covering fixed expenses
          </p>
        </div>
        <span className="text-2xl">🍯</span>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-8 mt-4">
        {/* Beehive SVG */}
        <div className="relative flex-shrink-0" style={{ width: 200, height: 280 }}>
          <svg viewBox="0 0 200 280" width="200" height="280">
            <defs>
              {/* Beehive shape clip path */}
              <clipPath id="beehive-clip">
                {/* Top dome */}
                <ellipse cx="100" cy="50" rx="45" ry="35" />
                {/* Upper body */}
                <ellipse cx="100" cy="85" rx="60" ry="30" />
                {/* Middle body (widest) */}
                <ellipse cx="100" cy="120" rx="72" ry="32" />
                {/* Lower middle */}
                <ellipse cx="100" cy="155" rx="68" ry="30" />
                {/* Lower body */}
                <ellipse cx="100" cy="188" rx="58" ry="28" />
                {/* Bottom */}
                <ellipse cx="100" cy="218" rx="45" ry="22" />
                {/* Base */}
                <ellipse cx="100" cy="240" rx="30" ry="15" />
              </clipPath>

              {/* Honey gradient */}
              <linearGradient id="honey-gradient" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="40%" stopColor="#f59e0b" />
                <stop offset="80%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#fcd34d" />
              </linearGradient>

              {/* Empty hive gradient */}
              <linearGradient id="hive-empty" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5f0e1" />
                <stop offset="100%" stopColor="#e8dcc8" />
              </linearGradient>
            </defs>

            {/* Beehive outline/ridges */}
            <g>
              <ellipse cx="100" cy="50" rx="45" ry="35" fill="none" stroke="#c9a032" strokeWidth="2.5" />
              <ellipse cx="100" cy="85" rx="60" ry="30" fill="none" stroke="#c9a032" strokeWidth="2.5" />
              <ellipse cx="100" cy="120" rx="72" ry="32" fill="none" stroke="#c9a032" strokeWidth="2.5" />
              <ellipse cx="100" cy="155" rx="68" ry="30" fill="none" stroke="#c9a032" strokeWidth="2.5" />
              <ellipse cx="100" cy="188" rx="58" ry="28" fill="none" stroke="#c9a032" strokeWidth="2.5" />
              <ellipse cx="100" cy="218" rx="45" ry="22" fill="none" stroke="#c9a032" strokeWidth="2.5" />
              <ellipse cx="100" cy="240" rx="30" ry="15" fill="none" stroke="#c9a032" strokeWidth="2.5" />
            </g>

            {/* Empty beehive fill */}
            <rect
              x="0" y="15" width="200" height="245"
              fill="url(#hive-empty)"
              clipPath="url(#beehive-clip)"
            />

            {/* Honey fill - rises from bottom */}
            <motion.rect
              x="0"
              width="200"
              height="245"
              fill="url(#honey-gradient)"
              clipPath="url(#beehive-clip)"
              initial={{ y: 260, height: 0 }}
              animate={{
                y: 260 - (fillPercentage / 100) * 245,
                height: (fillPercentage / 100) * 245,
              }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />

            {/* Milestone lines */}
            {milestones.map((milestone, i) => {
              const yPos = 260 - (milestone.percentage / 100) * 245;
              return (
                <g key={i}>
                  <line
                    x1="25" y1={yPos} x2="175" y2={yPos}
                    stroke={milestone.reached ? '#15803d' : '#9ca3af'}
                    strokeWidth="1.5"
                    strokeDasharray={milestone.reached ? '0' : '4 3'}
                    opacity={0.7}
                  />
                </g>
              );
            })}

            {/* Entrance hole */}
            <ellipse cx="100" cy="235" rx="12" ry="10" fill="#5c4a1e" opacity="0.6" />

            {/* Bee on top if target reached */}
            {overTarget && (
              <text x="100" y="20" textAnchor="middle" fontSize="24">🐝</text>
            )}
          </svg>

          {/* Percentage label */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: 40 }}>
            <motion.div
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <p className={`text-3xl font-bold ${overTarget ? 'text-green-700' : 'text-amber-900'}`}
                style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
              >
                {Math.round(fillPercentage)}%
              </p>
            </motion.div>
          </div>
        </div>

        {/* Milestones list */}
        <div className="flex-1 w-full space-y-3">
          {/* Revenue header */}
          <div className="mb-4">
            <p className="text-sm text-neutral-500">Month-to-Date Revenue</p>
            <p className={`text-3xl font-bold ${overTarget ? 'text-green-700' : 'text-charcoal-800'}`}>
              {formatCurrency(currentRevenue)}
            </p>
            <p className="text-sm text-neutral-500">
              of {formatCurrency(totalExpenses)} target
            </p>
          </div>

          {/* Milestone items */}
          {milestones.map((milestone, i) => {
            const individualProgress = Math.min(
              Math.max(
                ((currentRevenue - (milestone.cumulativeAmount - milestone.amount)) / milestone.amount) * 100,
                0
              ),
              100
            );

            return (
              <div key={i} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${milestone.reached ? 'text-green-600' : 'text-neutral-600'}`}>
                      {milestone.reached ? '✅' : '⬜'}
                    </span>
                    <span className={`text-sm font-medium ${milestone.reached ? 'text-green-700' : 'text-charcoal-700'}`}>
                      {milestone.name}
                    </span>
                  </div>
                  <span className={`text-sm font-semibold ${milestone.reached ? 'text-green-600' : 'text-neutral-600'}`}>
                    {formatCurrency(milestone.amount)}
                  </span>
                </div>
                <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${milestone.reached ? 'bg-green-500' : 'bg-amber-400'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${individualProgress}%` }}
                    transition={{ duration: 1.2, delay: i * 0.2, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Cumulative: {formatCurrency(milestone.cumulativeAmount)}
                </p>
              </div>
            );
          })}

          {/* Surplus/Deficit */}
          {totalExpenses > 0 && (
            <div className={`mt-4 p-3 rounded-xl ${overTarget ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className={`text-sm font-medium ${overTarget ? 'text-green-700' : 'text-amber-700'}`}>
                {overTarget
                  ? `🎉 Surplus: ${formatCurrency(currentRevenue - totalExpenses)} above expenses!`
                  : `${formatCurrency(totalExpenses - currentRevenue)} more needed to cover all expenses`
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
