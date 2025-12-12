/**
 * Customer Payments Page
 * Manage saved payment methods
 */

'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useUser } from '@/hooks/useUser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { AddPaymentMethodModal } from '@/components/pos/AddPaymentMethodModal';

interface SavedCard {
  id: string;
  stripe_payment_method_id: string;
  last4: string;
  brand: string;
  expiry_month: number;
  expiry_year: number;
  is_default: boolean;
}

function PaymentsContent() {
  const { user } = useUser();
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [deletingCard, setDeletingCard] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSavedCards = async () => {
    try {
      const response = await fetch('/api/stripe/payment-methods');
      if (response.ok) {
        const { paymentMethods } = await response.json();
        setSavedCards(paymentMethods || []);
      }
    } catch (error) {
      console.error('Error fetching saved cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedCards();
  }, []);

  const handleAddPaymentMethodSuccess = async () => {
    await fetchSavedCards();
    setShowAddCard(false);
    setMessage({ type: 'success', text: 'Payment method added successfully!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to remove this card?')) {
      return;
    }

    setDeletingCard(cardId);
    try {
      const response = await fetch(`/api/stripe/payment-methods?id=${cardId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSavedCards();
        setMessage({ type: 'success', text: 'Payment method removed.' });
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete card');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to remove card'
      });
    } finally {
      setDeletingCard(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSetDefault = async (cardId: string) => {
    setSettingDefault(cardId);
    try {
      const response = await fetch('/api/stripe/payment-methods/default', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: cardId }),
      });

      if (response.ok) {
        await fetchSavedCards();
        setMessage({ type: 'success', text: 'Default payment method updated.' });
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set default');
      }
    } catch (error) {
      console.error('Error setting default:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to set default'
      });
    } finally {
      setSettingDefault(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const formatCardBrand = (brand: string) => {
    const brands: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      diners: 'Diners Club',
      jcb: 'JCB',
      unionpay: 'UnionPay',
    };
    return brands[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const getCardIcon = (brand: string) => {
    const icons: Record<string, string> = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
      default: '💳',
    };
    return icons[brand.toLowerCase()] || icons.default;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/customer/dashboard">
            <Button variant="outline" size="sm" className="mb-4">
              ← Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Methods</h1>
          <p className="text-gray-600">Manage your saved payment methods</p>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Saved Cards */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Saved Cards</h2>
              <p className="text-sm text-gray-600">
                {savedCards.length} {savedCards.length === 1 ? 'card' : 'cards'} on file
              </p>
            </div>
            <Button onClick={() => setShowAddCard(true)}>
              + Add Card
            </Button>
          </div>

          {savedCards.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💳</span>
              </div>
              <p className="text-gray-600 mb-4">No payment methods saved yet</p>
              <Button onClick={() => setShowAddCard(true)}>
                Add Your First Card
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {savedCards.map((card) => (
                <div
                  key={card.id}
                  className={`p-4 rounded-lg border ${
                    card.is_default
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl">{getCardIcon(card.brand)}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-gray-900">
                            {formatCardBrand(card.brand)} •••• {card.last4}
                          </p>
                          {card.is_default && (
                            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Expires {card.expiry_month.toString().padStart(2, '0')}/{card.expiry_year.toString().slice(-2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!card.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(card.stripe_payment_method_id)}
                          disabled={settingDefault === card.stripe_payment_method_id}
                        >
                          {settingDefault === card.stripe_payment_method_id
                            ? 'Setting...'
                            : 'Set Default'}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCard(card.stripe_payment_method_id)}
                        disabled={deletingCard === card.stripe_payment_method_id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingCard === card.stripe_payment_method_id
                          ? 'Removing...'
                          : 'Remove'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="p-6 bg-blue-50 border border-blue-200">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">🔒</span>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Secure Payments</h3>
              <p className="text-sm text-blue-700">
                Your payment information is securely stored by Stripe, a PCI-compliant payment provider. We never store your full card details on our servers.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={showAddCard}
        onClose={() => setShowAddCard(false)}
        onSuccess={handleAddPaymentMethodSuccess}
      />
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <AuthGuard requireRole="customer">
      <PaymentsContent />
    </AuthGuard>
  );
}
