/**
 * Recharts color constants matching honeycomb palette
 * Used across all report chart components for consistent theming
 */

export const CHART_COLORS = {
  // Primary palette for main series
  honey: '#FFB900',
  honeyLight: '#FFE08A',
  honeyDark: '#CC9300',
  charcoal: '#2B2B2B',
  mint: '#A8E6CF',
  blue: '#B4D7E8',
  coral: '#FFB3BA',
  green: '#22c55e',
  purple: '#a78bfa',
  amber: '#f59e0b',

  // Status colors
  confirmed: '#22c55e',
  pending: '#f59e0b',
  cancelled: '#ef4444',
  done: '#3b82f6',

  // Neutral
  gray: '#8a8a8a',
  lightGray: '#e5e5e5',
  background: '#FFFDF7',
} as const;

// Ordered color series for multi-series charts
export const SERIES_COLORS = [
  CHART_COLORS.honey,
  CHART_COLORS.blue,
  CHART_COLORS.mint,
  CHART_COLORS.coral,
  CHART_COLORS.purple,
  CHART_COLORS.green,
  CHART_COLORS.amber,
  CHART_COLORS.charcoal,
] as const;

// Shared tooltip style
export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#fff',
    border: '1px solid #e5e5e5',
    borderRadius: '12px',
    boxShadow: '0 4px 25px -5px rgba(0,0,0,0.08)',
    fontSize: '13px',
  },
  labelStyle: {
    fontWeight: 600,
    color: '#2B2B2B',
    marginBottom: '4px',
  },
} as const;

export const CHART_MARGIN = { top: 5, right: 20, left: 10, bottom: 5 } as const;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return formatCurrency(amount);
}
