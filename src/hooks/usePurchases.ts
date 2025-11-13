/**
 * usePurchases Hook
 * Fetch purchases with automatic polling
 */

'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePurchases(customerId?: string, todayOnly: boolean = false) {
  const params = new URLSearchParams();
  if (customerId) params.append('customer_id', customerId);
  if (todayOnly) params.append('today', 'true');

  const queryString = params.toString();
  const url = `/api/purchases${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR(
    url,
    fetcher,
    {
      refreshInterval: 5000, // Poll every 5 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    purchases: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useTodayPurchases() {
  return usePurchases(undefined, true);
}

export function useCustomerPurchases(customerId: string) {
  return usePurchases(customerId, false);
}

