'use client';

import { useState, useCallback, useEffect } from 'react';

import useSWR from 'swr';

import { useDebounce } from '@/hooks/useDebounce';
import { buildApiUrl } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

import type { SearchResult } from '../types';

export interface GlobalSearchResponse {
  results: SearchResult[];
  query: string;
  total: number;
}

export function useGlobalSearch(initialQuery: string = '') {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 300);

  const shouldFetch = debouncedQuery.trim().length >= 2;

  const url = shouldFetch ? buildApiUrl('/api/explore/search', { q: debouncedQuery.trim() }) : null;

  const { data, error, isLoading, mutate } = useSWR<GlobalSearchResponse>(
    url,
    (url: string) => fetchApiData<GlobalSearchResponse>(url),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  useEffect(() => {
    if (!shouldFetch) {
      mutate(undefined, false);
    }
  }, [shouldFetch, mutate]);

  return {
    query,
    setQuery,
    debouncedQuery,
    results: data?.results || [],
    total: data?.total || 0,
    isLoading,
    error,
    clearSearch,
    search,
    refresh: mutate,
  };
}
