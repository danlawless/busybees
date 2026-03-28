'use client';

/**
 * useSetupIntent Hook
 * Fetches Stripe SetupIntent client secret for adding payment methods
 */

import { useState, useEffect } from 'react';

interface SetupIntentState {
  clientSecret: string | null;
  loading: boolean;
  error: string | null;
}

export function useSetupIntent() {
  const [state, setState] = useState<SetupIntentState>({
    clientSecret: null,
    loading: false,
    error: null,
  });

  const createSetupIntent = async () => {
    setState({ clientSecret: null, loading: true, error: null });

    try {
      const response = await fetch('/api/stripe/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // If session expired, refresh the page to let middleware renew the token
      if (response.status === 401) {
        window.location.reload();
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create setup intent');
      }

      const data = await response.json();
      setState({ clientSecret: data.clientSecret, loading: false, error: null });

      return data.clientSecret;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setState({ clientSecret: null, loading: false, error: errorMessage });
      throw err;
    }
  };

  const reset = () => {
    setState({ clientSecret: null, loading: false, error: null });
  };

  return {
    clientSecret: state.clientSecret,
    loading: state.loading,
    error: state.error,
    createSetupIntent,
    reset,
  };
}

