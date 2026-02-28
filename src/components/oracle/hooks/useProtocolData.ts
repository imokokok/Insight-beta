'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { logger } from '@/shared/logger';

export type ProtocolType = 'chainlink' | 'pyth' | 'api3' | 'band' | 'umapro' | 'dia';

export interface ProtocolDataConfig<T> {
  protocol: ProtocolType;
  endpoint: string;
  params?: Record<string, string | number | boolean>;
  refreshInterval?: number;
  cacheKey?: string;
  cacheTTL?: number;
  maxRetries?: number;
  retryDelay?: number;
  enabled?: boolean;
  transformData?: (raw: unknown) => T;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
}

export interface ProtocolDataState<T> {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  error: Error | null;
  retryCount: number;
  lastUpdated: Date | null;
}

export interface ProtocolDataActions<T> {
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  setData: (data: T) => void;
}

export interface ProtocolDataReturn<T> extends ProtocolDataState<T>, ProtocolDataActions<T> {
  formattedLastUpdated: string;
}

interface CacheData<T> {
  data: T;
  timestamp: number;
}

function formatLastUpdated(date: Date | null): string {
  if (!date) return '-';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  }

  return date.toLocaleDateString();
}

function buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
  if (!params || Object.keys(params).length === 0) {
    return endpoint;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}${searchParams.toString()}`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCachedData<T>(key: string, ttl: number): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(`cache_${key}`);
    if (!cached) return null;

    const { data, timestamp }: CacheData<T> = JSON.parse(cached);
    const now = Date.now();

    if (now - timestamp > ttl) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      `cache_${key}`,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    );
  } catch (error) {
    logger.error('Failed to cache data', { error, key });
  }
}

export function useProtocolData<T = unknown>(config: ProtocolDataConfig<T>): ProtocolDataReturn<T> {
  const {
    protocol,
    endpoint,
    params,
    refreshInterval = 30000,
    cacheKey,
    cacheTTL = 5 * 60 * 1000,
    maxRetries = 3,
    retryDelay = 1000,
    enabled = true,
    transformData,
    onError,
    onSuccess,
  } = config;

  const [state, setState] = useState<ProtocolDataState<T>>({
    data: null,
    isLoading: true,
    isRefreshing: false,
    isError: false,
    error: null,
    retryCount: 0,
    lastUpdated: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(
    async (signal: AbortSignal): Promise<T | null> => {
      const url = buildUrl(endpoint, params);

      const response = await fetch(url, { signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let rawData: unknown;
      try {
        rawData = await response.json();
      } catch {
        throw new Error('Failed to parse response JSON');
      }

      if (transformData) {
        return transformData(rawData);
      }

      return rawData as T;
    },
    [endpoint, params, transformData],
  );

  const executeFetch = useCallback(
    async (isRefresh = false): Promise<void> => {
      const currentRequestId = ++requestIdRef.current;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState((prev) => ({
        ...prev,
        isLoading: !isRefresh,
        isRefreshing: isRefresh,
        isError: false,
        error: null,
      }));

      let lastError: Error | null = null;
      let attempts = 0;

      while (attempts <= maxRetries) {
        if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
          return;
        }

        if (abortController.signal.aborted) {
          return;
        }

        try {
          const data = await fetchData(abortController.signal);

          if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
            return;
          }

          if (abortController.signal.aborted) {
            return;
          }

          if (cacheKey && data !== null) {
            setCachedData(cacheKey, data);
          }

          setState((prev) => ({
            ...prev,
            data,
            isLoading: false,
            isRefreshing: false,
            isError: false,
            error: null,
            retryCount: 0,
            lastUpdated: new Date(),
          }));

          if (data !== null) {
            onSuccess?.(data);
          }
          return;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            logger.debug('Fetch aborted', { protocol, endpoint });
            return;
          }

          lastError = error instanceof Error ? error : new Error(String(error));
          attempts++;

          if (attempts <= maxRetries) {
            logger.warn(`Retrying fetch (attempt ${attempts}/${maxRetries})`, {
              protocol,
              endpoint,
              error: lastError.message,
            });

            await sleep(retryDelay * attempts);

            if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
              return;
            }
          }
        }
      }

      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return;
      }

      logger.error('Fetch failed after all retries', {
        protocol,
        endpoint,
        error: lastError?.message,
      });

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        isError: true,
        error: lastError,
        retryCount: attempts,
      }));

      if (lastError) {
        onError?.(lastError);
      }
    },
    [fetchData, maxRetries, retryDelay, cacheKey, protocol, endpoint, onError, onSuccess],
  );

  const refresh = useCallback(async () => {
    await executeFetch(true);
  }, [executeFetch]);

  const retry = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      retryCount: 0,
      isError: false,
      error: null,
    }));
    await executeFetch(false);
  }, [executeFetch]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState({
      data: null,
      isLoading: false,
      isRefreshing: false,
      isError: false,
      error: null,
      retryCount: 0,
      lastUpdated: null,
    });
  }, []);

  const setData = useCallback((data: T) => {
    setState((prev) => ({
      ...prev,
      data,
      lastUpdated: new Date(),
    }));
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const effectiveCacheKey = cacheKey ?? `${protocol}_${endpoint}`;
    const cachedData = getCachedData<T>(effectiveCacheKey, cacheTTL);

    if (cachedData) {
      setState((prev) => ({
        ...prev,
        data: cachedData,
        isLoading: false,
        lastUpdated: new Date(),
      }));
    } else {
      executeFetch(false);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, cacheKey, cacheTTL, protocol, endpoint, executeFetch]);

  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    intervalRef.current = setInterval(() => {
      executeFetch(true);
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, refreshInterval, executeFetch]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    refresh,
    retry,
    reset,
    setData,
    formattedLastUpdated: formatLastUpdated(state.lastUpdated),
  };
}

export default useProtocolData;
