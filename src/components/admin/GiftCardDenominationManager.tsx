/**
 * Gift Card Denomination Manager Component
 * Create and manage gift card amounts for the gift card system
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { logger } from '@/lib/client-logger';

interface Denomination {
  id: string;
  amount: number;
  is_active: boolean;
  sort_order: number;
}

interface GiftCardDenominationManagerProps {
  onUpdate?: () => void;
}

export function GiftCardDenominationManager({ onUpdate }: GiftCardDenominationManagerProps) {
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    amount: '',
    is_active: true,
    sort_order: 0,
  });

  // Fetch denominations
  const fetchDenominations = async () => {
    try {
      const response = await fetch('/api/gift-cards/denominations');
      if (response.ok) {
        const data = await response.json();
        setDenominations(data.denominations || []);
      }
    } catch (err) {
      logger.error({ error: err }, 'Failed to fetch denominations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDenominations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      const payload: {
        id?: string;
        amount: number;
        is_active: boolean;
        sort_order: number;
      } = {
        amount,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      };

      if (editingId) {
        payload.id = editingId;
      }

      const response = await fetch('/api/gift-cards/denominations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save denomination');
      }

      setSuccess(editingId ? 'Denomination updated!' : 'Denomination created!');
      setShowForm(false);
      setEditingId(null);
      setFormData({ amount: '', is_active: true, sort_order: 0 });
      fetchDenominations();
      onUpdate?.();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (denom: Denomination) => {
    setEditingId(denom.id);
    setFormData({
      amount: denom.amount.toString(),
      is_active: denom.is_active,
      sort_order: denom.sort_order,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this denomination?')) return;

    try {
      const response = await fetch(`/api/gift-cards/denominations?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete denomination');
      }

      setSuccess('Denomination deleted!');
      fetchDenominations();
      onUpdate?.();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleToggleActive = async (denom: Denomination) => {
    try {
      const response = await fetch('/api/gift-cards/denominations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: denom.id,
          amount: denom.amount,
          is_active: !denom.is_active,
          sort_order: denom.sort_order,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update denomination');
      }

      fetchDenominations();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ amount: '', is_active: true, sort_order: 0 });
    setError('');
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <span className="mr-2">🎁</span>
            Gift Card Denominations
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage the available gift card amounts
          </p>
        </div>
        {!showForm && (
          <Button
            variant="primary"
            onClick={() => {
              setShowForm(true);
              setError('');
              setSuccess('');
            }}
          >
            + Add Amount
          </Button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
          ✓ {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          ✕ {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-4">
            {editingId ? 'Edit Denomination' : 'Add New Denomination'}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="50.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) =>
                  setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>
          <div className="flex space-x-3 mt-4">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={cancelForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Denominations List */}
      <div className="space-y-3">
        {denominations.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No denominations yet. Add your first gift card amount!
          </p>
        ) : (
          denominations.map((denom) => (
            <div
              key={denom.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                denom.is_active
                  ? 'bg-white border-gray-200'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center shadow">
                  <span className="text-white font-bold text-lg">
                    ${denom.amount.toFixed(0)}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    ${denom.amount.toFixed(2)} Gift Card
                  </p>
                  <p className="text-sm text-gray-500">
                    Order: {denom.sort_order} •{' '}
                    <span className={denom.is_active ? 'text-green-600' : 'text-red-600'}>
                      {denom.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(denom)}
                >
                  {denom.is_active ? 'Disable' : 'Enable'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(denom)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(denom.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

