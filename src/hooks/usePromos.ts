/**
 * usePromos Hook
 * Fetch promos with automatic polling
 */

'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePromos(includeAll: boolean = false) {
  const url = includeAll ? '/api/promos?all=true' : '/api/promos';

  const { data, error, isLoading, mutate } = useSWR(
    url,
    fetcher,
    {
      refreshInterval: 30000, // Poll every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    promos: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useActivePromos() {
  return usePromos(false);
}

export function useAllPromos() {
  return usePromos(true);
}

