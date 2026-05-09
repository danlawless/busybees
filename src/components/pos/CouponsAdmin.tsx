'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Coupon {
  id: string;
  code: string;
  name: string | null;
  discount_type: 'amount' | 'percent';
  amount: number | null;
  discount_percent: number | null;
  status: 'active' | 'redeemed' | 'expired' | 'voided';
  expires_at: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
  redeemed_purchase_id: string | null;
  amount_applied: number | null;
  notes: string | null;
  created_by_admin: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  active: number;
  redeemed: number;
  totalRedeemed: number;
}

function formatDiscount(c: Coupon): string {
  if (c.discount_type === 'percent') return `${Number(c.discount_percent).toFixed(0)}% off`;
  return `$${Number(c.amount).toFixed(2)}`;
}

const STATUS_LABEL: Record<Coupon['status'], string> = {
  active: 'Active',
  redeemed: 'Redeemed',
  expired: 'Expired',
  voided: 'Voided',
};

const STATUS_COLOR: Record<Coupon['status'], string> = {
  active: 'bg-green-100 text-green-800',
  redeemed: 'bg-gray-100 text-gray-700',
  expired: 'bg-yellow-100 text-yellow-800',
  voided: 'bg-red-100 text-red-800',
};

export function CouponsAdmin() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, redeemed: 0, totalRedeemed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Coupon['status']>('all');
  const [form, setForm] = useState({
    name: '',
    discount_type: 'amount' as 'amount' | 'percent',
    amount: '',
    discount_percent: '',
    notes: '',
    createdByAdmin: '',
  });
  const [createdCoupon, setCreatedCoupon] = useState<Coupon | null>(null);

  const fetchCoupons = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/coupons');
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
        setStats(data.stats || { total: 0, active: 0, redeemed: 0, totalRedeemed: 0 });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (search && !c.code.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [coupons, search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: {
      name?: string;
      discount_type: 'amount' | 'percent';
      amount?: number;
      discount_percent?: number;
      notes?: string;
      createdByAdmin?: string;
    } = {
      discount_type: form.discount_type,
      name: form.name || undefined,
      notes: form.notes || undefined,
      createdByAdmin: form.createdByAdmin || undefined,
    };

    if (form.discount_type === 'amount') {
      const amount = parseFloat(form.amount);
      if (!amount || amount <= 0) return;
      body.amount = amount;
    } else {
      const pct = parseFloat(form.discount_percent);
      if (!pct || pct <= 0 || pct > 100) return;
      body.discount_percent = pct;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedCoupon(data.coupon);
        setForm({ name: '', discount_type: 'amount', amount: '', discount_percent: '', notes: '', createdByAdmin: '' });
        setShowForm(false);
        fetchCoupons();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create coupon');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleVoid = async (id: string) => {
    if (!confirm('Void this coupon? It will no longer be redeemable.')) return;
    setVoidingId(id);
    try {
      const res = await fetch(`/api/admin/coupons/${id}/void`, { method: 'POST' });
      if (res.ok) {
        fetchCoupons();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to void coupon');
      }
    } finally {
      setVoidingId(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-gray-600">Total Coupons</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-gray-600">Active</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-gray-600">Redeemed</p>
            <p className="text-2xl font-bold mt-1">{stats.redeemed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-gray-600">Total Redeemed</p>
            <p className="text-2xl font-bold mt-1">${stats.totalRedeemed.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Just-created coupon banner */}
      {createdCoupon && (
        <Card className="border-2 border-green-400 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-green-800">Coupon created — share this code with the customer:</p>
            <div className="flex items-center gap-3 mt-2">
              <code className="text-xl font-mono font-bold text-green-900 bg-white px-3 py-2 rounded border border-green-200">
                {createdCoupon.code}
              </code>
              <Button onClick={() => copyCode(createdCoupon.code)} size="sm" variant="outline">
                Copy
              </Button>
              <Button onClick={() => setCreatedCoupon(null)} size="sm" variant="outline">
                Dismiss
              </Button>
            </div>
            <p className="text-xs text-green-700 mt-2">
              {createdCoupon.name ? `${createdCoupon.name} — ` : ''}
              {formatDiscount(createdCoupon)} — valid until {formatDate(createdCoupon.expires_at)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Header / Controls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>🎟️ Coupons</CardTitle>
          <Button onClick={() => setShowForm(s => !s)} size="sm">
            {showForm ? 'Cancel' : '+ New Coupon'}
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleCreate} className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Birthday Promo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="discount_type"
                      value="amount"
                      checked={form.discount_type === 'amount'}
                      onChange={() => setForm(f => ({ ...f, discount_type: 'amount' }))}
                    />
                    Dollar amount
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="discount_type"
                      value="percent"
                      checked={form.discount_type === 'percent'}
                      onChange={() => setForm(f => ({ ...f, discount_type: 'percent' }))}
                    />
                    Percent off
                  </label>
                </div>
              </div>
              {form.discount_type === 'amount' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., 10.00"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Percent off (1-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    required
                    value={form.discount_percent}
                    onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., 25"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Customer name or reason for issuing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issued by (optional)</label>
                <input
                  type="text"
                  value={form.createdByAdmin}
                  onChange={e => setForm(f => ({ ...f, createdByAdmin: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Staff name"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Coupon'}</Button>
              </div>
              <p className="text-xs text-gray-600">Coupons expire 365 days after creation. Single-use, day-pass purchases only. Dollar amounts above the pass price are forfeited at redemption.</p>
            </form>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by code..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | Coupon['status'])}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="redeemed">Redeemed</option>
              <option value="expired">Expired</option>
              <option value="voided">Voided</option>
            </select>
          </div>

          {/* List */}
          {isLoading ? (
            <p className="text-gray-600">Loading coupons...</p>
          ) : filteredCoupons.length === 0 ? (
            <p className="text-gray-600">No coupons found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Discount</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Expires</th>
                    <th className="px-3 py-2">Notes</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoupons.map(c => {
                    const expired = c.status === 'active' && new Date(c.expires_at) < new Date();
                    const status = expired ? 'expired' : c.status;
                    return (
                      <tr key={c.id} className="border-t border-gray-200">
                        <td className="px-3 py-2 font-mono">
                          <button onClick={() => copyCode(c.code)} className="hover:underline" title="Click to copy">
                            {c.code}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{c.name || '—'}</td>
                        <td className="px-3 py-2">{formatDiscount(c)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[status]}`}>
                            {STATUS_LABEL[status]}
                          </span>
                          {c.status === 'redeemed' && c.amount_applied != null && (
                            <span className="ml-2 text-xs text-gray-500">
                              (applied ${Number(c.amount_applied).toFixed(2)})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{formatDate(c.expires_at)}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{c.notes || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{formatDate(c.created_at)}</td>
                        <td className="px-3 py-2">
                          {c.status === 'active' && !expired && (
                            <Button
                              onClick={() => handleVoid(c.id)}
                              size="sm"
                              variant="outline"
                              disabled={voidingId === c.id}
                            >
                              {voidingId === c.id ? 'Voiding...' : 'Void'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
