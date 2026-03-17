'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useReportData, ForecastData } from '@/hooks/useReportData';
import { ReportKpiCard } from './ReportKpiCard';
import { ReportChartCard } from './ReportChartCard';
import { CHART_COLORS, TOOLTIP_STYLE, CHART_MARGIN, formatCurrency, formatCompactCurrency } from './chartTheme';
import { RevenueBeehive } from './RevenueBeehive';

interface FixedExpense {
  id: string;
  category: string;
  name: string;
  amount: number;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
}

const EXPENSE_CATEGORIES = [
  'rent', 'payroll', 'utilities', 'insurance', 'supplies', 'marketing', 'software', 'other',
];

function monthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function ForecastSection() {
  const { data, isLoading, mutate } = useReportData<ForecastData>('forecast', { enabled: true });

  // --- Fixed Expense Management ---
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    category: 'rent',
    name: '',
    amount: '',
    effective_from: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [savingExpense, setSavingExpense] = useState(false);

  const fetchExpenses = useCallback(async () => {
    const res = await fetch('/api/admin/fixed-expenses');
    if (res.ok) {
      const data = await res.json();
      setExpenses(data.expenses || []);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleSaveExpense = async () => {
    if (!expenseForm.name || !expenseForm.amount) return;
    setSavingExpense(true);

    const payload = {
      category: expenseForm.category,
      name: expenseForm.name,
      amount: parseFloat(expenseForm.amount),
      effective_from: expenseForm.effective_from,
      notes: expenseForm.notes || undefined,
    };

    const url = editingId ? `/api/admin/fixed-expenses/${editingId}` : '/api/admin/fixed-expenses';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      await fetchExpenses();
      mutate();
      setShowExpenseForm(false);
      setEditingId(null);
      setExpenseForm({ category: 'rent', name: '', amount: '', effective_from: new Date().toISOString().slice(0, 10), notes: '' });
    }
    setSavingExpense(false);
  };

  const handleDeleteExpense = async (id: string) => {
    const res = await fetch(`/api/admin/fixed-expenses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchExpenses();
      mutate();
    }
  };

  const handleEditExpense = (expense: FixedExpense) => {
    setEditingId(expense.id);
    setExpenseForm({
      category: expense.category,
      name: expense.name,
      amount: String(expense.amount),
      effective_from: expense.effective_from,
      notes: expense.notes || '',
    });
    setShowExpenseForm(true);
  };

  // Chart data
  const monthlyChartData = (data?.monthlyHistory || []).map(m => ({
    ...m,
    month: monthLabel(m.month),
  }));

  const seasonalChartData = (data?.seasonalComparison || []).map(m => ({
    ...m,
    month: monthLabel(m.month),
  }));

  const projectionChartData = (data?.projections || []).map(p => ({
    window: p.window,
    'Confirmed Bookings': p.confirmedRevenue,
    'Projected Subscriptions': p.projectedSubscriptionRevenue,
    'Fixed Expenses': p.totalFixedExpenses,
  }));

  const totalMonthlyExpenses = expenses
    .filter(e => !e.effective_to)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Current month revenue (last entry in monthlyHistory is current month)
  const currentMonthRevenue = data?.monthlyHistory?.length
    ? data.monthlyHistory[data.monthlyHistory.length - 1].revenue
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard
          label="Monthly Expenses"
          value={formatCurrency(data?.monthlyFixedExpenses || 0)}
          icon="💸"
          loading={isLoading}
        />
        <ReportKpiCard
          label="30-Day Net Projection"
          value={formatCurrency(data?.projections?.[0]?.netProjection || 0)}
          icon={data?.projections?.[0]?.netProjection && data.projections[0].netProjection >= 0 ? '📈' : '📉'}
          loading={isLoading}
        />
        <ReportKpiCard
          label="Avg Monthly Revenue"
          value={formatCurrency(data?.breakEven?.avgMonthlyRevenue || 0)}
          icon="💰"
          loading={isLoading}
        />
        <ReportKpiCard
          label="Active Subscriptions"
          value={data?.breakEven?.activeSubscriptions || 0}
          icon="🔄"
          loading={isLoading}
          trend={data?.breakEven?.monthlySubscriptionRevenue ? {
            value: data.breakEven.monthlySubscriptionRevenue,
            label: `${formatCurrency(data.breakEven.monthlySubscriptionRevenue)}/mo MRR`,
          } : undefined}
        />
      </div>

      {/* Revenue Beehive */}
      <RevenueBeehive
        currentRevenue={currentMonthRevenue}
        expenses={data?.expenseBreakdown || []}
        loading={isLoading}
      />

      {/* Break-Even Insights */}
      {data?.breakEven && (
        <div className="bg-white rounded-2xl shadow-soft border border-primary-200/20 p-5">
          <h3 className="text-base font-semibold text-charcoal-800 mb-3">Break-Even Analysis</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-neutral-500 mb-1">Monthly Break-Even</p>
              <p className="text-xl font-bold text-amber-700">{formatCurrency(data.breakEven.monthlyExpenses)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-neutral-500 mb-1">Avg Revenue/Party</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(data.breakEven.revenuePerParty)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-neutral-500 mb-1">Parties to Break Even</p>
              <p className="text-xl font-bold text-blue-700">{data.breakEven.partiesNeededForBreakEven}</p>
              <p className="text-xs text-neutral-500 mt-1">per month (parties only)</p>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Projections Chart */}
      <ReportChartCard
        title="Revenue Projections"
        subtitle="Confirmed bookings + projected subscriptions vs fixed expenses"
        loading={isLoading}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={projectionChartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
            <XAxis dataKey="window" />
            <YAxis tickFormatter={(v) => formatCompactCurrency(v)} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Bar dataKey="Confirmed Bookings" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Projected Subscriptions" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Fixed Expenses" fill={CHART_COLORS.coral} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ReportChartCard>

      {/* Revenue vs Expenses (Monthly History) */}
      <ReportChartCard
        title="Revenue vs Expenses"
        subtitle="Monthly revenue breakdown with expense baseline (last 12 months)"
        loading={isLoading}
      >
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={monthlyChartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v) => formatCompactCurrency(v)} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Bar dataKey="partyRevenue" name="Parties" stackId="revenue" fill={CHART_COLORS.honey} />
            <Bar dataKey="passRevenue" name="Passes" stackId="revenue" fill={CHART_COLORS.blue} />
            <Bar dataKey="foodRevenue" name="Food & Bev" stackId="revenue" fill={CHART_COLORS.mint} />
            <Bar dataKey="giftCardRevenue" name="Gift Cards" stackId="revenue" fill={CHART_COLORS.purple} radius={[4, 4, 0, 0]} />
            <ReferenceLine y={data?.monthlyFixedExpenses || 0} stroke={CHART_COLORS.cancelled} strokeDasharray="5 5" label={{ value: 'Expenses', fill: CHART_COLORS.cancelled, fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      </ReportChartCard>

      {/* Seasonal Trend */}
      <ReportChartCard
        title="Seasonal Trend"
        subtitle="Current year vs previous year revenue by month"
        loading={isLoading}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={seasonalChartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.lightGray} />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v) => formatCompactCurrency(v)} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Line type="monotone" dataKey="currentYear" name="This Year" stroke={CHART_COLORS.honey} strokeWidth={3} dot={{ fill: CHART_COLORS.honey, r: 4 }} />
            <Line type="monotone" dataKey="previousYear" name="Last Year" stroke={CHART_COLORS.gray} strokeWidth={2} strokeDasharray="5 5" dot={{ fill: CHART_COLORS.gray, r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ReportChartCard>

      {/* Fixed Expenses Manager */}
      <div className="bg-white rounded-2xl shadow-soft border border-primary-200/20 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-charcoal-800">Fixed Monthly Expenses</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Total: {formatCurrency(totalMonthlyExpenses)}/month
            </p>
          </div>
          <button
            onClick={() => {
              setShowExpenseForm(!showExpenseForm);
              setEditingId(null);
              setExpenseForm({ category: 'rent', name: '', amount: '', effective_from: new Date().toISOString().slice(0, 10), notes: '' });
            }}
            style={{ backgroundColor: showExpenseForm ? '#ef4444' : '#f59e0b', color: '#ffffff' }}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          >
            {showExpenseForm ? 'Cancel' : '+ Add Expense'}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showExpenseForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-honey-500"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={expenseForm.name}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Monthly Rent"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-honey-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount ($/month)</label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-honey-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Effective From</label>
                <input
                  type="date"
                  value={expenseForm.effective_from}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, effective_from: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-honey-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional details..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-honey-500"
              />
            </div>
            <button
              onClick={handleSaveExpense}
              disabled={savingExpense || !expenseForm.name || !expenseForm.amount}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {savingExpense ? 'Saving...' : editingId ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        )}

        {/* Expense Table */}
        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">Category</th>
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">Name</th>
                  <th className="text-right py-2 px-3 font-medium text-neutral-500">Amount</th>
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">Since</th>
                  <th className="text-right py-2 px-3 font-medium text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.filter(e => !e.effective_to).map(expense => (
                  <tr key={expense.id} className="border-b border-gray-100">
                    <td className="py-2 px-3 capitalize">{expense.category}</td>
                    <td className="py-2 px-3">{expense.name}</td>
                    <td className="py-2 px-3 text-right font-medium">{formatCurrency(expense.amount)}</td>
                    <td className="py-2 px-3 text-neutral-500">{expense.effective_from}</td>
                    <td className="py-2 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleEditExpense(expense)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-neutral-500 text-center py-4">
            No fixed expenses configured. Add your monthly costs to enable projections.
          </p>
        )}
      </div>
    </div>
  );
}
