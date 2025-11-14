/**
 * useCustomers Hook
 * Fetch customers with automatic polling
 */

'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCustomers() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/customers',
    fetcher,
    {
      refreshInterval: 10000, // Poll every 10 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    customers: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useCustomer(id: string | null, includeDetails: boolean = false) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/customers/${id}${includeDetails ? '?details=true' : ''}` : null,
    fetcher,
    {
      refreshInterval: 10000,
      revalidateOnFocus: true,
    }
  );

  return {
    customer: data,
    isLoading,
    isError: error,
    mutate,
  };
}

