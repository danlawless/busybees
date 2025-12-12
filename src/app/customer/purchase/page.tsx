/**
 * Purchase Completion Page
 * Handles checkout after user signs up/logs in
 * Retrieves purchase intent from sessionStorage and creates Stripe checkout
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ShoppingCart, AlertCircle, ArrowLeft } from 'lucide-react';

// Purchase intent stored in sessionStorage
interface PurchaseIntent {
  passId: string;
  passName: string;
  price: number;
  category: string;
  stripePriceId: string | null;
  stripeProductId: string | null;
}

export default function PurchasePage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [purchaseIntent, setPurchaseIntent] = useState<PurchaseIntent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [checkoutTriggered, setCheckoutTriggered] = useState(false);

  // Handle checkout - memoized to prevent dependency issues
  const handleCheckout = useCallback(async (intent: PurchaseIntent) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const purchaseType = `${intent.category}_pass` as 'day_pass' | 'weekly_pass' | 'monthly_pass';

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: intent.passId,
          productName: intent.passName,
          productPrice: intent.price * 100, // Convert to cents
          purchaseType,
          metadata: {
            stripe_price_id: intent.stripePriceId,
            stripe_product_id: intent.stripeProductId,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Clear the purchase intent from storage
      sessionStorage.removeItem('purchaseIntent');

      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Unable to start checkout. Please try again.');
      setIsProcessing(false);
    }
  }, [isProcessing]);

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

  // Process checkout once authenticated and intent is loaded
  useEffect(() => {
    if (!mounted || authLoading || checkoutTriggered) return;

    // If not authenticated, redirect to signup
    if (!isAuthenticated) {
      router.push('/customer/signup?redirect=/customer/purchase');
      return;
    }

    // If no purchase intent, don't proceed
    if (!purchaseIntent) {
      return;
    }

    // Auto-proceed with checkout (only once)
    setCheckoutTriggered(true);
    handleCheckout(purchaseIntent);
  }, [mounted, authLoading, isAuthenticated, purchaseIntent, router, handleCheckout, checkoutTriggered]);

  const handleRetry = () => {
    if (purchaseIntent) {
      setCheckoutTriggered(false);
      setError(null);
      handleCheckout(purchaseIntent);
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

  // Show loading while checking auth
  if (!mounted || authLoading) {
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

  // Processing state
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
