/**
 * usePasses Hook
 * Fetch passes with automatic polling
 */

'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePasses(includeAll: boolean = false) {
  const url = includeAll ? '/api/passes?all=true' : '/api/passes';

  const { data, error, isLoading, mutate } = useSWR(
    url,
    fetcher,
    {
      refreshInterval: 30000, // Poll every 30 seconds (passes don't change often)
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    passes: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useActivePasses() {
  return usePasses(false);
}

export function useAllPasses() {
  return usePasses(true);
}

