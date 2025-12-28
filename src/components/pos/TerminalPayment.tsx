/**
 * Terminal Payment Component
 * Handles the payment collection flow using Stripe Terminal
 *
 * This component:
 * 1. Creates a PaymentIntent via our API
 * 2. Uses the connected reader to collect the card
 * 3. Processes and confirms the payment
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTerminalContext } from './TerminalProvider';
import {
  CreditCard,
  Loader2,
  Check,
  X,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentStatus =
  | 'idle'
  | 'creating'
  | 'collecting'
  | 'processing'
  | 'success'
  | 'error'
  | 'cancelled';

interface TerminalPaymentProps {
  customerId: string;
  amount: number;
  description?: string;
  metadata?: Record<string, string>;
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function TerminalPayment({
  customerId,
  amount,
  description,
  metadata,
  onSuccess,
  onError,
  onCancel,
  className,
}: TerminalPaymentProps) {
  const { isConnected, connectedReader, processPayment, cancelPayment } =
    useTerminalContext();

  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  const handleCollectPayment = useCallback(async () => {
    if (!isConnected) {
      setError('No reader connected');
      return;
    }

    setStatus('creating');
    setError(null);

    try {
      // 1. Create PaymentIntent via our API
      const response = await fetch('/api/stripe/terminal/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          customer_id: customerId,
          description,
          metadata,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create payment');
      }

      const { payment_intent_id, client_secret } = await response.json();
      setPaymentIntentId(payment_intent_id);

      // 2. Collect payment using the reader
      setStatus('collecting');
      const result = await processPayment(client_secret);

      // 3. Payment successful
      setStatus('success');

      // Type assertion for the paymentIntent
      const pi = result.paymentIntent as { id: string };
      onSuccess?.(pi.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      setStatus('error');
      onError?.(message);
    }
  }, [
    isConnected,
    amount,
    customerId,
    description,
    metadata,
    processPayment,
    onSuccess,
    onError,
  ]);

  const handleCancel = useCallback(async () => {
    try {
      await cancelPayment();
      setStatus('cancelled');
      onCancel?.();
    } catch {
      // Ignore cancel errors
    }
  }, [cancelPayment, onCancel]);

  const handleRetry = useCallback(() => {
    setStatus('idle');
    setError(null);
    setPaymentIntentId(null);
  }, []);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Not connected state
  if (!isConnected) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-3" />
          <p className="text-gray-600 mb-2">No card reader connected</p>
          <p className="text-sm text-gray-500">
            Please connect a card reader to process payments.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-6', className)}>
      {/* Amount Display */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-3">
          <DollarSign className="h-8 w-8 text-amber-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900">
          {formatCurrency(Math.round(amount * 100))}
        </div>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>

      {/* Reader Info */}
      <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-600">
        <CreditCard className="h-4 w-4" />
        <span>
          Using: {connectedReader?.label || connectedReader?.device_type}
        </span>
      </div>

      {/* Status Display */}
      {status === 'idle' && (
        <Button onClick={handleCollectPayment} className="w-full" size="lg">
          <CreditCard className="h-5 w-5 mr-2" />
          Collect Payment
        </Button>
      )}

      {status === 'creating' && (
        <div className="text-center py-4">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-amber-500 mb-2" />
          <p className="text-gray-600">Preparing payment...</p>
        </div>
      )}

      {status === 'collecting' && (
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="relative">
              <CreditCard className="h-12 w-12 mx-auto text-amber-500 animate-pulse" />
              <div className="absolute -bottom-1 -right-1 left-0 mx-auto w-fit">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>
            </div>
            <p className="text-lg font-medium text-gray-900 mt-4">
              Tap, Insert, or Swipe Card
            </p>
            <p className="text-sm text-gray-500">
              Waiting for customer to present card...
            </p>
          </div>
          <Button
            onClick={handleCancel}
            variant="secondary"
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      )}

      {status === 'processing' && (
        <div className="text-center py-4">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-amber-500 mb-2" />
          <p className="text-gray-600">Processing payment...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-3">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-lg font-medium text-green-700">
            Payment Successful!
          </p>
          {paymentIntentId && (
            <p className="text-xs text-gray-500 mt-2">
              Payment ID: {paymentIntentId.slice(0, 20)}...
            </p>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-3">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-lg font-medium text-red-700">Payment Failed</p>
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
          <Button onClick={handleRetry} className="w-full">
            Try Again
          </Button>
        </div>
      )}

      {status === 'cancelled' && (
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-3">
              <X className="h-8 w-8 text-gray-500" />
            </div>
            <p className="text-lg font-medium text-gray-700">
              Payment Cancelled
            </p>
          </div>
          <Button onClick={handleRetry} className="w-full">
            Start Over
          </Button>
        </div>
      )}
    </Card>
  );
}

