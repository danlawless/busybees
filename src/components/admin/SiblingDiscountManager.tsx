'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/client-logger';

interface SiblingDiscount {
  id: string;
  child_position: number;
  discount_percent: number;
  is_active: boolean;
  applies_to_monthly_only: boolean;
  created_at: string;
  updated_at: string;
}

interface SiblingDiscountManagerProps {
  onUpdate?: () => void;
}

export function SiblingDiscountManager({ onUpdate }: SiblingDiscountManagerProps) {
  const [discounts, setDiscounts] = useState<SiblingDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [newPosition, setNewPosition] = useState<number>(2);
  const [newPercent, setNewPercent] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDiscounts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/sibling-discounts');
      if (!response.ok) {
        throw new Error('Failed to fetch discounts');
      }
      const data = await response.json();
      setDiscounts(data);
      setError('');
    } catch (err) {
      logger.error({ error: err }, 'Error fetching sibling discounts');
      setError('Failed to load discounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const handleToggleActive = async (discount: SiblingDiscount) => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/admin/sibling-discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_position: discount.child_position,
          discount_percent: discount.discount_percent,
          is_active: !discount.is_active,
          applies_to_monthly_only: discount.applies_to_monthly_only,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update discount');
      }

      await fetchDiscounts();
      setSuccess(`Discount for child #${discount.child_position} ${!discount.is_active ? 'enabled' : 'disabled'}`);
      setTimeout(() => setSuccess(''), 3000);
      onUpdate?.();
    } catch (err) {
      logger.error({ error: err }, 'Error toggling discount');
      setError('Failed to update discount');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePercent = async (discount: SiblingDiscount) => {
    if (editValue < 0 || editValue > 100) {
      setError('Discount must be between 0 and 100');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/admin/sibling-discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_position: discount.child_position,
          discount_percent: editValue,
          is_active: discount.is_active,
          applies_to_monthly_only: discount.applies_to_monthly_only,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update discount');
      }

      await fetchDiscounts();
      setEditingId(null);
      setSuccess(`Discount for child #${discount.child_position} updated to ${editValue}%`);
      setTimeout(() => setSuccess(''), 3000);
      onUpdate?.();
    } catch (err) {
      logger.error({ error: err }, 'Error updating discount');
      setError('Failed to update discount');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDiscount = async () => {
    if (newPosition < 2 || newPosition > 10) {
      setError('Child position must be between 2 and 10');
      return;
    }
    if (newPercent < 0 || newPercent > 100) {
      setError('Discount must be between 0 and 100');
      return;
    }

    // Check if position already exists
    if (discounts.some(d => d.child_position === newPosition)) {
      setError(`Discount for child #${newPosition} already exists. Edit the existing one instead.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/admin/sibling-discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_position: newPosition,
          discount_percent: newPercent,
          is_active: true,
          applies_to_monthly_only: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add discount');
      }

      await fetchDiscounts();
      setNewPosition(Math.min(newPosition + 1, 10));
      setNewPercent(Math.min(newPercent + 10, 100));
      setSuccess(`Discount for child #${newPosition} added successfully`);
      setTimeout(() => setSuccess(''), 3000);
      onUpdate?.();
    } catch (err) {
      logger.error({ error: err }, 'Error adding discount');
      setError('Failed to add discount');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDiscount = async (discount: SiblingDiscount) => {
    if (!confirm(`Are you sure you want to delete the discount for child #${discount.child_position}?`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/admin/sibling-discounts?id=${discount.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete discount');
      }

      await fetchDiscounts();
      setSuccess(`Discount for child #${discount.child_position} deleted`);
      setTimeout(() => setSuccess(''), 3000);
      onUpdate?.();
    } catch (err) {
      logger.error({ error: err }, 'Error deleting discount');
      setError('Failed to delete discount');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPositionLabel = (position: number) => {
    const labels: Record<number, string> = {
      2: '2nd',
      3: '3rd',
      4: '4th',
      5: '5th',
      6: '6th',
      7: '7th',
      8: '8th',
      9: '9th',
      10: '10th',
    };
    return labels[position] || `${position}th`;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sibling Discount Settings</h2>
        <p className="text-gray-600 text-sm">
          Configure progressive discounts for monthly memberships when purchasing for multiple children.
          The 1st child always pays full price.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Existing Discounts */}
      <div className="space-y-3 mb-6">
        {discounts.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            No sibling discounts configured yet. Add one below.
          </div>
        ) : (
          discounts.map((discount) => (
            <div
              key={discount.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                discount.is_active
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-amber-600">
                    {discount.child_position}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {getPositionLabel(discount.child_position)} Child
                  </div>
                  {editingId === discount.id ? (
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editValue}
                        onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border rounded text-sm"
                      />
                      <span className="text-gray-600">% off</span>
                      <Button
                        size="sm"
                        onClick={() => handleUpdatePercent(discount)}
                        disabled={isSubmitting}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="text-gray-600">
                      <span className="text-lg font-medium text-amber-600">
                        {discount.discount_percent}% off
                      </span>
                      {discount.applies_to_monthly_only && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Monthly only
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {editingId !== discount.id && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(discount.id);
                        setEditValue(discount.discount_percent);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={discount.is_active ? 'outline' : 'primary'}
                      onClick={() => handleToggleActive(discount)}
                      disabled={isSubmitting}
                    >
                      {discount.is_active ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteDiscount(discount)}
                      disabled={isSubmitting}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add New Discount */}
      <div className="border-t pt-6">
        <h3 className="font-semibold text-gray-900 mb-4">Add New Sibling Discount</h3>
        <div className="flex items-end space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Child Position
            </label>
            <select
              value={newPosition}
              onChange={(e) => setNewPosition(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-lg"
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10]
                .filter((pos) => !discounts.some((d) => d.child_position === pos))
                .map((pos) => (
                  <option key={pos} value={pos}>
                    {getPositionLabel(pos)} child
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={newPercent}
              onChange={(e) => setNewPercent(parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-2 border rounded-lg"
            />
          </div>
          <Button
            onClick={handleAddDiscount}
            disabled={isSubmitting || discounts.length >= 9}
          >
            Add Discount
          </Button>
        </div>
        {discounts.length >= 9 && (
          <p className="text-sm text-gray-500 mt-2">
            Maximum of 9 sibling discounts reached (positions 2-10).
          </p>
        )}
      </div>

      {/* Preview */}
      {discounts.length > 0 && (
        <div className="border-t mt-6 pt-6">
          <h3 className="font-semibold text-gray-900 mb-3">Discount Preview</h3>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-2">
              For a family purchasing monthly memberships:
            </p>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center">
                <span className="w-24 font-medium">1st child:</span>
                <span>Full price</span>
              </li>
              {discounts
                .filter((d) => d.is_active)
                .sort((a, b) => a.child_position - b.child_position)
                .map((d) => (
                  <li key={d.id} className="flex items-center">
                    <span className="w-24 font-medium">
                      {getPositionLabel(d.child_position)} child:
                    </span>
                    <span className="text-green-600 font-medium">
                      {d.discount_percent}% off
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
