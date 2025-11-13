/**
 * Stripe Product Manager Component
 * Create and manage Stripe products directly from the platform
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { logger } from '@/lib/logger';

interface StripeProductManagerProps {
  onProductCreated?: () => void;
}

export function StripeProductManager({ onProductCreated }: StripeProductManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    productType: 'pass' as 'pass' | 'party' | 'product',
    category: 'day' as string,
    isRecurring: false,
    interval: 'month' as 'day' | 'week' | 'month' | 'year',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      // Validate price
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        throw new Error('Please enter a valid price');
      }

      // Create product with price in Stripe
      const response = await fetch('/api/stripe/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: formData.name,
            description: formData.description,
            metadata: {
              type: formData.productType,
              category: formData.category,
            },
          },
          price: {
            unit_amount: Math.round(price * 100), // Convert to cents
            currency: 'usd',
            recurring: formData.isRecurring ? {
              interval: formData.interval,
            } : undefined,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create product');
      }

      const result = await response.json();
      
      logger.info({ 
        productId: result.product.id, 
        priceId: result.price.id 
      }, '✨ Product created in Stripe');

      // Now save to appropriate database table
      let dbResponse;
      
      if (formData.productType === 'pass') {
        dbResponse = await fetch('/api/passes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            category: formData.category,
            price,
            duration: formData.category === 'day' ? 8 : formData.category === 'weekly' ? 7 : 30,
            sessions_included: formData.category === 'day' ? 1 : 999,
            description: formData.description,
            stripe_product_id: result.product.id,
            stripe_price_id: result.price.id,
            stripe_purchase_link: result.paymentLink.url,
            is_active: true,
          }),
        });
      }

      if (dbResponse && !dbResponse.ok) {
        logger.warn({}, 'Product created in Stripe but failed to save to database');
      }

      setSuccess(`Product created successfully! Payment link: ${result.paymentLink.url}`);
      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        price: '',
        productType: 'pass',
        category: 'day',
        isRecurring: false,
        interval: 'month',
      });

      if (onProductCreated) onProductCreated();
    } catch (err) {
      logger.error({ error: err }, 'Failed to create product');
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Stripe Product Manager</h3>
        <Button onClick={() => setShowForm(true)} size="sm">
          ✨ Create Stripe Product
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
              Create New Product in Stripe
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Monthly Pass - Toddler"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the product..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Type *
                </label>
                <select
                  value={formData.productType}
                  onChange={(e) => setFormData({ ...formData, productType: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="pass">Pass</option>
                  <option value="party">Party Package</option>
                  <option value="product">Food/Beverage/Retail</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  {formData.productType === 'pass' && (
                    <>
                      <option value="day">Day Pass</option>
                      <option value="weekly">Weekly Pass</option>
                      <option value="monthly">Monthly Pass</option>
                    </>
                  )}
                  {formData.productType === 'product' && (
                    <>
                      <option value="food">Food</option>
                      <option value="beverage">Beverage</option>
                      <option value="retail">Retail</option>
                    </>
                  )}
                  {formData.productType === 'party' && (
                    <option value="party">Party Package</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price * (USD)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="17.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>

            <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
              <input
                type="checkbox"
                id="isRecurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="isRecurring" className="text-sm text-gray-700 font-medium">
                Recurring subscription (for memberships)
              </label>
            </div>

            {formData.isRecurring && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Interval *
                </label>
                <select
                  value={formData.interval}
                  onChange={(e) => setFormData({ ...formData, interval: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
            )}

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
                {isSubmitting ? '⏳ Creating...' : '✨ Create in Stripe'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">💡 Products created here will:</p>
          <ul className="text-sm space-y-1">
            <li>✅ Be added to your Stripe account</li>
            <li>✅ Generate a payment link automatically</li>
            <li>✅ Sync to your database</li>
            <li>✅ Be available for immediate use</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

