'use client';

/**
 * Add Payment Method Modal
 * Modal for adding payment methods using Stripe Payment Element
 * Maintains the original beautiful UI design
 */

import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentForm({ onSuccess, onError }: { onSuccess: () => void; onError: (msg: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processingPayment, setProcessingPayment] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessingPayment(true);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'An error occurred');
      } else {
        onSuccess();
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={() => onError('cancelled')}
          disabled={processingPayment}
          className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processingPayment}
          className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {processingPayment ? '💳 Processing...' : '💾 Save Card'}
        </button>
      </div>
    </form>
  );
}

export function AddPaymentMethodModal({
  isOpen,
  onClose,
  onSuccess,
}: AddPaymentMethodModalProps) {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Stripe publishable key
    const loadStripeKey = async () => {
      const response = await fetch('/api/stripe/config');
      const { publishableKey } = await response.json();
      if (publishableKey) {
        setStripePromise(loadStripe(publishableKey));
      }
    };
    loadStripeKey();
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Reset state and create fresh SetupIntent each time modal opens
      setClientSecret(null);
      setError(null);
      setLoading(false);
      createSetupIntent();
    } else {
      // Clean up when modal closes
      setClientSecret(null);
      setError(null);
    }
  }, [isOpen]);

  const createSetupIntent = async () => {
    setLoading(true);
    setError(null);

    try {
      let response = await fetch('/api/stripe/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // If session expired, refresh the page to let middleware renew the token
      if (response.status === 401) {
        window.location.reload();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create setup intent');
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    // Reset state before calling success callback
    setClientSecret(null);
    setError(null);
    onSuccess();
  };

  const handleError = (errorMessage: string) => {
    if (errorMessage === 'cancelled') {
      onClose();
    } else {
      alert(`Error: ${errorMessage}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💳</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Add Payment Method
          </h2>
          <p className="text-gray-600">
            Enter your card details to make purchases
          </p>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Preparing secure payment form...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button
              onClick={onClose}
              className="mt-3 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Close
            </button>
          </div>
        )}

        {clientSecret && stripePromise && !loading && !error && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#3B82F6',
                  colorBackground: '#ffffff',
                  colorText: '#1F2937',
                  colorDanger: '#EF4444',
                  fontFamily: 'system-ui, sans-serif',
                  spacingUnit: '4px',
                  borderRadius: '8px',
                },
              },
            }}
          >
            <PaymentForm onSuccess={handleSuccess} onError={handleError} />
          </Elements>
        )}

        <div className="mt-6 text-xs text-gray-500 text-center">
          🔒 Your payment information is secure and encrypted
        </div>
      </div>
    </div>
  );
}
