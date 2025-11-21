'use client';

/**
 * Stripe Provider Component
 * Wraps the application with Stripe Elements context
 */

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { ReactNode, useEffect, useState } from 'react';

let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = async () => {
  if (!stripePromise) {
    // Fetch publishable key from API
    const response = await fetch('/api/stripe/config');
    const { publishableKey } = await response.json();

    if (!publishableKey) {
      console.error('Stripe publishable key not configured');
      return null;
    }

    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

interface StripeProviderProps {
  children: ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);

  useEffect(() => {
    getStripe().then(setStripe);
  }, []);

  if (!stripe) {
    // Still loading Stripe
    return <>{children}</>;
  }

  return (
    <Elements stripe={stripe}>
      {children}
    </Elements>
  );
}

