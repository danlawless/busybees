/**
 * Newsletter Unsubscribe Page
 * Allows subscribers to unsubscribe from the newsletter via link
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!email) {
      setStatus('error');
      setMessage('No email address provided.');
    }
  }, [email]);

  const handleUnsubscribe = async () => {
    if (!email) return;

    setStatus('loading');
    try {
      const response = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setStatus('success');
        setMessage('You have been unsubscribed from our newsletter. We\'re sorry to see you go!');
      } else {
        setStatus('error');
        setMessage('Something went wrong. Please try again or contact us.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again or contact us.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-cream to-pastel-yellow flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">&#x1F41D;</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Newsletter Unsubscribe
          </h1>
        </div>

        {status === 'idle' && email && (
          <div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to unsubscribe <strong>{email}</strong> from the Busy Bees newsletter?
            </p>
            <div className="space-y-3">
              <Button
                onClick={handleUnsubscribe}
                variant="outline"
                className="w-full"
              >
                Yes, Unsubscribe Me
              </Button>
              <p className="text-xs text-gray-400">
                You can always resubscribe from our website.
              </p>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <p className="text-gray-500">Processing your request...</p>
        )}

        {status === 'success' && (
          <div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">&#x2705;</span>
            </div>
            <p className="text-gray-600 mb-4">{message}</p>
            <a
              href="/"
              className="text-sm text-yellow-600 hover:text-yellow-700 underline"
            >
              Visit Busy Bees
            </a>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">&#x274C;</span>
            </div>
            <p className="text-gray-600 mb-4">{message}</p>
            <a
              href="/"
              className="text-sm text-yellow-600 hover:text-yellow-700 underline"
            >
              Visit Busy Bees
            </a>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-pastel-cream to-pastel-yellow flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <p className="text-gray-500">Loading...</p>
        </Card>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
