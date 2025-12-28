/**
 * useSessions Hook
 * Fetch active sessions with automatic polling
 */

'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useSessions(customerId?: string) {
  const url = customerId
    ? `/api/sessions?customer_id=${customerId}`
    : '/api/sessions';

  const { data, error, isLoading, mutate } = useSWR(
    url,
    fetcher,
    {
      refreshInterval: 5000, // Poll every 5 seconds for active sessions
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    sessions: data?.sessions || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useActiveSessions() {
  return useSessions();
}

export function useCustomerSessions(customerId: string) {
  return useSessions(customerId);
}

