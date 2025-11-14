/**
 * Stripe Coupon Manager Component
 * Create and manage Stripe coupons/promos directly from the platform
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { logger } from '@/lib/logger';

interface StripeCouponManagerProps {
  onCouponCreated?: () => void;
}

export function StripeCouponManager({ onCouponCreated }: StripeCouponManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    couponCode: '',
    name: '',
    discountPercent: '',
    duration: 'once' as 'forever' | 'once' | 'repeating',
    durationMonths: '',
    maxRedemptions: '',
    // Promo data
    promoName: '',
    startDate: '',
    endDate: '',
    description: '',
    bannerStyle: 'honeycomb' as const,
    createPromo: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      // Validate
      const discountPercent = parseInt(formData.discountPercent);
      if (isNaN(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
        throw new Error('Discount must be between 1 and 100');
      }

      if (formData.duration === 'repeating' && !formData.durationMonths) {
        throw new Error('Duration in months is required for repeating coupons');
      }

      // Prepare coupon data
      const couponData: any = {
        id: formData.couponCode.toUpperCase(),
        name: formData.name,
        percent_off: discountPercent,
        duration: formData.duration,
        metadata: {
          created_via: 'busybees_platform',
        },
      };

      if (formData.duration === 'repeating') {
        couponData.duration_in_months = parseInt(formData.durationMonths);
      }

      if (formData.maxRedemptions) {
        couponData.max_redemptions = parseInt(formData.maxRedemptions);
      }

      // Add promo data if creating promo
      if (formData.createPromo) {
        couponData.create_promo = true;
        couponData.promo_data = {
          name: formData.promoName,
          start_date: formData.startDate,
          end_date: formData.endDate,
          description: formData.description,
          banner_style: formData.bannerStyle,
          is_active: true,
        };
      }

      // Create coupon in Stripe (and promo in DB if requested)
      const response = await fetch('/api/stripe/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(couponData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create coupon');
      }

      const result = await response.json();

      logger.info({ couponId: result.id }, '🎉 Coupon created in Stripe');

      setSuccess(`Coupon "${formData.couponCode}" created successfully!${formData.createPromo ? ' Promo also created.' : ''}`);

      // Reset form
      setFormData({
        couponCode: '',
        name: '',
        discountPercent: '',
        duration: 'once',
        durationMonths: '',
        maxRedemptions: '',
        promoName: '',
        startDate: '',
        endDate: '',
        description: '',
        bannerStyle: 'honeycomb',
        createPromo: true,
      });

      setShowForm(false);

      if (onCouponCreated) onCouponCreated();
    } catch (err) {
      logger.error({ error: err }, 'Failed to create coupon');
      setError(err instanceof Error ? err.message : 'Failed to create coupon');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Stripe Coupon Manager</h3>
        <Button onClick={() => setShowForm(true)} size="sm">
          🎫 Create Coupon
        </Button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">✅ {success}</p>
        </div>
      )}

      {showForm && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Coupon
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Code * (e.g., SUMMER25)
                </label>
                <input
                  type="text"
                  value={formData.couponCode}
                  onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                  placeholder="BLACKFRIDAY40"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Percent * (1-100)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.discountPercent}
                  onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                  placeholder="25"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Summer Sale"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration *
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="once">One-time use</option>
                  <option value="forever">Forever</option>
                  <option value="repeating">Repeating (X months)</option>
                </select>
              </div>

              {formData.duration === 'repeating' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Months *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.durationMonths}
                    onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                    placeholder="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    required={formData.duration === 'repeating'}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Redemptions (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxRedemptions}
                  onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                  placeholder="100"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            {/* Create Promo Toggle */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg mb-4">
                <input
                  type="checkbox"
                  id="createPromo"
                  checked={formData.createPromo}
                  onChange={(e) => setFormData({ ...formData, createPromo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="createPromo" className="text-sm text-gray-700 font-medium">
                  Also create promotional banner for website
                </label>
              </div>

              {formData.createPromo && (
                <div className="space-y-4 pl-4 border-l-4 border-blue-300">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Promo Name *
                    </label>
                    <input
                      type="text"
                      value={formData.promoName}
                      onChange={(e) => setFormData({ ...formData, promoName: e.target.value })}
                      placeholder="Black Friday Sale!"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required={formData.createPromo}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required={formData.createPromo}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date *
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required={formData.createPromo}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Promo Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Amazing deals on memberships!"
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required={formData.createPromo}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Banner Style *
                    </label>
                    <select
                      value={formData.bannerStyle}
                      onChange={(e) => setFormData({ ...formData, bannerStyle: e.target.value as any })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="honeycomb">🐝 Honeycomb (Yellow & Orange)</option>
                      <option value="gradient-wave">✨ Gradient Wave (Purple & Pink)</option>
                      <option value="confetti">🎉 Confetti (Blue & Purple)</option>
                      <option value="minimal">⚡ Minimal (Clean White)</option>
                      <option value="bold-stripes">⚠️ Bold Stripes (Black & Yellow)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? '⏳ Creating...' : '🎫 Create Coupon'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">💡 Coupons created here will:</p>
          <ul className="text-sm space-y-1">
            <li>✅ Be added to your Stripe account</li>
            <li>✅ Work with Stripe checkout links</li>
            <li>✅ Optionally create website promo banner</li>
            <li>✅ Track redemptions automatically</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

