'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type RefreshStatus = 'idle' | 'loading' | 'success' | 'error';

interface DataRefreshState {
  status: RefreshStatus;
  lastUpdated: Date | null;
  error: Error | null;
  retryCount: number;
}

interface UseDataRefreshOptions {
  maxRetries?: number;
  retryDelay?: number;
  staleThreshold?: number;
}

export function useDataRefresh(options: UseDataRefreshOptions = {}) {
  const { maxRetries = 3, retryDelay = 2000, staleThreshold = 300 } = options;

  const [state, setState] = useState<DataRefreshState>({
    status: 'idle',
    lastUpdated: null,
    error: null,
    retryCount: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const refresh = useCallback(
    async <T>(fetchFn: (signal: AbortSignal) => Promise<T>): Promise<T | null> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      abortControllerRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        status: 'loading',
        error: null,
      }));

      try {
        const data = await fetchFn(abortControllerRef.current.signal);

        setState({
          status: 'success',
          lastUpdated: new Date(),
          error: null,
          retryCount: 0,
        });

        return data;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return null;
        }

        let currentRetryCount = 0;
        setState((prev) => {
          currentRetryCount = prev.retryCount + 1;
          return prev;
        });

        if (currentRetryCount < maxRetries) {
          retryTimeoutRef.current = setTimeout(() => {
            setState((prev) => ({ ...prev, retryCount: currentRetryCount }));
            refresh(fetchFn);
          }, retryDelay * currentRetryCount);
        }

        setState((prev) => ({
          status: 'error',
          lastUpdated: prev.lastUpdated,
          error: error instanceof Error ? error : new Error(String(error)),
          retryCount: currentRetryCount,
        }));

        return null;
      }
    },
    [maxRetries, retryDelay],
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setState((prev) => ({
      ...prev,
      status: 'idle',
    }));
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setState({
      status: 'idle',
      lastUpdated: null,
      error: null,
      retryCount: 0,
    });
  }, []);

  const isStale = state.lastUpdated
    ? Date.now() - state.lastUpdated.getTime() > staleThreshold * 1000
    : true;

  return {
    ...state,
    isStale,
    isLoading: state.status === 'loading',
    isError: state.status === 'error',
    isSuccess: state.status === 'success',
    refresh,
    cancel,
    reset,
  };
}

export function useMultipleDataRefresh(dataSources: string[]) {
  const [states, setStates] = useState<Record<string, DataRefreshState>>(
    Object.fromEntries(
      dataSources.map((key) => [
        key,
        {
          status: 'idle',
          lastUpdated: null,
          error: null,
          retryCount: 0,
        },
      ]),
    ),
  );

  const abortControllersRef = useRef<Record<string, AbortController>>({});

  const refreshOne = useCallback(
    async <T>(key: string, fetchFn: (signal: AbortSignal) => Promise<T>): Promise<T | null> => {
      if (abortControllersRef.current[key]) {
        abortControllersRef.current[key].abort();
      }

      abortControllersRef.current[key] = new AbortController();

      setStates((prev) => ({
        ...prev,
        [key]: {
          status: 'loading',
          lastUpdated: prev[key]?.lastUpdated ?? null,
          error: null,
          retryCount: prev[key]?.retryCount ?? 0,
        },
      }));

      try {
        const data = await fetchFn(abortControllersRef.current[key].signal);

        setStates((prev) => ({
          ...prev,
          [key]: {
            status: 'success',
            lastUpdated: new Date(),
            error: null,
            retryCount: 0,
          },
        }));

        return data;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return null;
        }

        setStates((prev) => ({
          ...prev,
          [key]: {
            status: 'error',
            lastUpdated: prev[key]?.lastUpdated ?? null,
            error: error instanceof Error ? error : new Error(String(error)),
            retryCount: (prev[key]?.retryCount ?? 0) + 1,
          },
        }));

        return null;
      }
    },
    [],
  );

  const refreshAll = useCallback(
    async <T>(fetchers: Record<string, (signal: AbortSignal) => Promise<T>>) => {
      await Promise.all(Object.entries(fetchers).map(([key, fetchFn]) => refreshOne(key, fetchFn)));
    },
    [refreshOne],
  );

  const getState = useCallback(
    (key: string) =>
      states[key] || {
        status: 'idle',
        lastUpdated: null,
        error: null,
        retryCount: 0,
      },
    [states],
  );

  return {
    states,
    refreshOne,
    refreshAll,
    getState,
  };
}
