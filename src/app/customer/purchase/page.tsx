/**
 * Purchase Completion Page
 * Handles checkout after user signs up/logs in
 * Uses saved payment methods for one-click purchases when available
 * Falls back to Stripe checkout if no saved payment method
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ShoppingCart, AlertCircle, ArrowLeft, CreditCard, CheckCircle } from 'lucide-react';

// Purchase intent stored in sessionStorage
interface PurchaseIntent {
  passId: string;
  passName: string;
  price: number;
  category: string;
  stripePriceId: string | null;
  stripeProductId: string | null;
}

interface SavedCard {
  id: string;
  stripe_payment_method_id: string;
  last4: string;
  brand: string;
  expiry_month: number;
  expiry_year: number;
  is_default: boolean;
}

export default function PurchasePage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [purchaseIntent, setPurchaseIntent] = useState<PurchaseIntent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [checkoutTriggered, setCheckoutTriggered] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [loadingCards, setLoadingCards] = useState(true);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  // Fetch saved payment methods
  const fetchSavedCards = useCallback(async () => {
    try {
      const response = await fetch('/api/stripe/payment-methods');
      if (response.ok) {
        const { paymentMethods } = await response.json();
        setSavedCards(paymentMethods || []);
        // Auto-select default card
        const defaultCard = paymentMethods?.find((c: SavedCard) => c.is_default) || paymentMethods?.[0];
        if (defaultCard) {
          setSelectedCardId(defaultCard.stripe_payment_method_id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch saved cards:', err);
    } finally {
      setLoadingCards(false);
    }
  }, []);

  // Handle direct payment with saved card
  const handleDirectPayment = useCallback(async (intent: PurchaseIntent, paymentMethodId: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const purchaseType = `${intent.category}_pass` as 'day_pass' | 'weekly_pass' | 'monthly_pass';

      const response = await fetch('/api/stripe/direct-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: intent.passId,
          productName: intent.passName,
          productPrice: intent.price,
          purchaseType,
          paymentMethodId,
          metadata: {
            stripe_price_id: intent.stripePriceId,
            stripe_product_id: intent.stripeProductId,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      // Handle 3DS authentication if required
      if (data.requiresAction) {
        throw new Error('Your bank requires additional verification. Please try a different card.');
      }

      if (data.success) {
        // Clear the purchase intent from storage
        sessionStorage.removeItem('purchaseIntent');

        // Show success and redirect
        setPurchaseSuccess(data.message || 'Purchase complete!');
        setTimeout(() => {
          router.push('/customer/account?tab=passes');
        }, 2000);
      }
    } catch (err) {
      console.error('Direct payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  }, [isProcessing, router]);


  // Load purchase intent from sessionStorage on mount
  useEffect(() => {
    setMounted(true);
    const stored = sessionStorage.getItem('purchaseIntent');
    if (stored) {
      try {
        const intent = JSON.parse(stored) as PurchaseIntent;
        setPurchaseIntent(intent);
      } catch {
        console.error('Failed to parse purchase intent');
        setError('Could not retrieve your selected pass. Please try again.');
      }
    }
  }, []);

  // Fetch saved cards once authenticated
  useEffect(() => {
    if (isAuthenticated && mounted) {
      fetchSavedCards();
    }
  }, [isAuthenticated, mounted, fetchSavedCards]);

  // Process checkout once authenticated and intent is loaded
  useEffect(() => {
    if (!mounted || authLoading || checkoutTriggered || loadingCards) return;

    // If not authenticated, redirect to signup
    if (!isAuthenticated) {
      router.push('/customer/signup?redirect=/customer/purchase');
      return;
    }

    // If no purchase intent, don't proceed
    if (!purchaseIntent) {
      return;
    }

    // If user has saved cards, show the one-click purchase UI instead of auto-checkout
    if (savedCards.length > 0) {
      // Don't auto-checkout - let user confirm with saved card
      return;
    }

    // No saved cards - show error message instead of redirecting to Stripe
    setCheckoutTriggered(true);
    setError('Please add a payment method to your account first. You can add a card in your Account settings.');
  }, [mounted, authLoading, isAuthenticated, purchaseIntent, router, checkoutTriggered, savedCards.length, loadingCards]);

  const handleRetry = () => {
    if (purchaseIntent) {
      // If user has saved cards now, clear error and let them try again with direct payment
      if (savedCards.length > 0) {
        setCheckoutTriggered(false);
        setError(null);
      } else {
        // Still no cards - redirect to account to add one
        router.push('/customer/account?tab=payments');
      }
    }
  };

  const handleGoBack = () => {
    sessionStorage.removeItem('purchaseIntent');
    router.push('/');
  };

  // Helper to wrap content with layout
  const withLayout = (content: React.ReactNode) => (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 flex items-center justify-center py-12 px-4">
        {content}
      </div>
      <Footer />
    </div>
  );

  // Show loading while checking auth or loading cards
  if (!mounted || authLoading || loadingCards) {
    return withLayout(
      <Card className="p-8 max-w-md w-full text-center">
        <Loader2 className="w-12 h-12 animate-spin text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Loading...
        </h2>
      </Card>
    );
  }

  // No purchase intent found
  if (!purchaseIntent && !error) {
    return withLayout(
      <Card className="p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-8 h-8 text-yellow-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          No Pass Selected
        </h2>
        <p className="text-gray-600 mb-6">
          It looks like you haven't selected a pass to purchase yet.
          Browse our options and select the one that's right for your family.
        </p>
        <Button
          onClick={() => router.push('/')}
          className="w-full"
          size="lg"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Browse Passes
        </Button>
      </Card>
    );
  }

  // Success state
  if (purchaseSuccess) {
    return withLayout(
      <Card className="p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎉 Purchase Complete!
        </h2>
        <p className="text-gray-600 mb-4">
          {purchaseSuccess}
        </p>
        <p className="text-sm text-gray-500">
          Redirecting to your account...
        </p>
      </Card>
    );
  }

  // Error state
  if (error) {
    return withLayout(
      <Card className="p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Checkout Error
        </h2>
        <p className="text-gray-600 mb-2">
          {error}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Don't worry - no payment was processed.
        </p>
        <div className="space-y-3">
          <Button
            onClick={handleRetry}
            className="w-full"
            size="lg"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Try Again'
            )}
          </Button>
          <Button
            onClick={handleGoBack}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Passes
          </Button>
        </div>
      </Card>
    );
  }

  // One-click purchase UI when user has saved cards
  if (savedCards.length > 0 && purchaseIntent) {
    const selectedCard = savedCards.find(c => c.stripe_payment_method_id === selectedCardId) || savedCards[0];

    return withLayout(
      <Card className="p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Complete Your Purchase
          </h2>
          <p className="text-gray-600">
            One-click purchase with your saved card
          </p>
        </div>

        {/* Purchase Summary */}
        <div className="bg-yellow-50 rounded-lg p-4 mb-6 border border-yellow-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                🎫 {purchaseIntent.passName}
              </p>
              <p className="text-sm text-gray-600 capitalize">
                {purchaseIntent.category} Pass
              </p>
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              ${purchaseIntent.price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Saved Cards Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <div className="space-y-2">
            {savedCards.map((card) => (
              <button
                key={card.stripe_payment_method_id}
                onClick={() => setSelectedCardId(card.stripe_payment_method_id)}
                disabled={isProcessing}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  selectedCardId === card.stripe_payment_method_id
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedCardId === card.stripe_payment_method_id ? 'bg-yellow-400' : 'bg-gray-100'
                }`}>
                  <CreditCard className={`w-5 h-5 ${
                    selectedCardId === card.stripe_payment_method_id ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 capitalize">{card.brand}</span>
                    <span className="text-gray-500">•••• {card.last4}</span>
                    {card.is_default && (
                      <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Expires {card.expiry_month.toString().padStart(2, '0')}/{card.expiry_year}
                  </p>
                </div>
                {selectedCardId === card.stripe_payment_method_id && (
                  <CheckCircle className="w-5 h-5 text-yellow-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Purchase Button */}
        <div className="space-y-3">
          <Button
            onClick={() => handleDirectPayment(purchaseIntent, selectedCardId!)}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
            size="lg"
            disabled={isProcessing || !selectedCardId}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                💳 Pay ${purchaseIntent.price.toFixed(2)} with •••• {selectedCard?.last4}
              </>
            )}
          </Button>

          <Button
            onClick={handleGoBack}
            variant="outline"
            className="w-full"
            size="lg"
            disabled={isProcessing}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          🔒 Your payment is secured by Stripe
        </p>
      </Card>
    );
  }

  // Processing state (redirecting to Stripe checkout)
  return withLayout(
    <Card className="p-8 max-w-md w-full text-center">
      <Loader2 className="w-12 h-12 animate-spin text-yellow-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Preparing Your Checkout
      </h2>
      {purchaseIntent && (
        <div className="bg-yellow-50 rounded-lg p-4 mb-4">
          <p className="text-lg font-semibold text-gray-900">
            {purchaseIntent.passName}
          </p>
          <p className="text-2xl font-bold text-yellow-600">
            ${purchaseIntent.price}
          </p>
        </div>
      )}
      <p className="text-gray-600 mb-4">
        Redirecting you to secure payment...
      </p>
      <p className="text-sm text-gray-500">
        You'll be redirected to Stripe to complete your purchase.
      </p>
    </Card>
  );
}
