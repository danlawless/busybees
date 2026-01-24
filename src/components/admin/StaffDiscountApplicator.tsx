/**
 * Staff Discount Applicator Component
 * Allows staff to apply staff-only discounts to pending party bookings
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/client-logger';

interface Promo {
  id: string;
  name: string;
  discount_percent: number;
  description: string;
}

interface StaffDiscountApplicatorProps {
  bookingId: string;
  currentPromoId: string | null;
  currentDiscountPercent: number;
  currentDiscountAmount: number;
  originalTotal: number;
  onDiscountApplied?: (newCheckoutUrl: string) => void;
  onDiscountRemoved?: (newCheckoutUrl: string) => void;
}

export function StaffDiscountApplicator({
  bookingId,
  currentPromoId,
  currentDiscountPercent,
  currentDiscountAmount,
  originalTotal,
  onDiscountApplied,
  onDiscountRemoved,
}: StaffDiscountApplicatorProps) {
  const [staffDiscounts, setStaffDiscounts] = useState<Promo[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStaffDiscounts();
  }, []);

  const fetchStaffDiscounts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/staff-discounts');
      if (!response.ok) {
        throw new Error('Failed to fetch staff discounts');
      }
      const data = await response.json();
      setStaffDiscounts(data);
    } catch (err) {
      logger.error({ error: err }, 'Failed to fetch staff discounts');
      setError('Could not load staff discounts');
    } finally {
      setIsLoading(false);
    }
  };

  const applyDiscount = async () => {
    if (!selectedPromoId) {
      setError('Please select a discount');
      return;
    }

    try {
      setIsApplying(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/admin/party-bookings/${bookingId}/apply-discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promo_id: selectedPromoId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to apply discount');
      }

      const result = await response.json();
      setSuccess(`${result.discount.percent}% discount applied! New checkout link generated.`);
      setSelectedPromoId('');

      if (onDiscountApplied && result.checkoutUrl) {
        onDiscountApplied(result.checkoutUrl);
      }

      // Reload discounts to get fresh state
      fetchStaffDiscounts();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      logger.error({ error: err }, 'Failed to apply discount');
      setError(err instanceof Error ? err.message : 'Failed to apply discount');
    } finally {
      setIsApplying(false);
    }
  };

  const removeDiscount = async () => {
    try {
      setIsApplying(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/admin/party-bookings/${bookingId}/apply-discount`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove discount');
      }

      const result = await response.json();
      setSuccess('Discount removed. New checkout link generated.');

      if (onDiscountRemoved && result.checkoutUrl) {
        onDiscountRemoved(result.checkoutUrl);
      }

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      logger.error({ error: err }, 'Failed to remove discount');
      setError(err instanceof Error ? err.message : 'Failed to remove discount');
    } finally {
      setIsApplying(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Calculate preview of selected discount
  const selectedDiscount = staffDiscounts.find((d) => d.id === selectedPromoId);
  const previewDiscountAmount = selectedDiscount
    ? (originalTotal * selectedDiscount.discount_percent) / 100
    : 0;
  const previewTotal = originalTotal - previewDiscountAmount;

  return (
    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-blue-800 font-medium text-sm">Staff Discount</span>
        {currentPromoId && (
          <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
            {currentDiscountPercent}% Applied
          </span>
        )}
      </div>

      {/* Current discount info */}
      {currentPromoId && (
        <div className="bg-green-50 border border-green-200 rounded p-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-green-800">
              <strong>Current Discount:</strong> {currentDiscountPercent}% off
            </span>
            <span className="text-green-800 font-medium">
              -{formatCurrency(currentDiscountAmount)}
            </span>
          </div>
          <div className="text-green-700 text-xs mt-1">
            Customer will pay: {formatCurrency(originalTotal - currentDiscountAmount)}
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-800">
          {success}
        </div>
      )}

      {/* Discount selector */}
      {!currentPromoId && (
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-sm text-neutral-600">Loading discounts...</div>
          ) : staffDiscounts.length === 0 ? (
            <div className="text-sm text-neutral-600">
              No staff discounts available. Create one in the Coupon Manager.
            </div>
          ) : (
            <>
              <select
                value={selectedPromoId}
                onChange={(e) => setSelectedPromoId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isApplying}
              >
                <option value="">Select a staff discount...</option>
                {staffDiscounts.map((discount) => (
                  <option key={discount.id} value={discount.id}>
                    {discount.name} ({discount.discount_percent}% off)
                  </option>
                ))}
              </select>

              {/* Preview */}
              {selectedDiscount && (
                <div className="bg-white border border-neutral-200 rounded p-2 text-sm">
                  <div className="text-neutral-600">{selectedDiscount.description}</div>
                  <div className="flex justify-between mt-1">
                    <span>Original: {formatCurrency(originalTotal)}</span>
                    <span className="text-green-600 font-medium">
                      New Total: {formatCurrency(previewTotal)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {currentPromoId ? (
          <Button
            size="sm"
            variant="outline"
            onClick={removeDiscount}
            disabled={isApplying}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            {isApplying ? 'Removing...' : 'Remove Discount'}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={applyDiscount}
            disabled={!selectedPromoId || isApplying || staffDiscounts.length === 0}
          >
            {isApplying ? 'Applying...' : 'Apply Discount'}
          </Button>
        )}
      </div>
    </div>
  );
}
