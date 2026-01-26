'use client';

import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdating: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isUpdating: false,
    registration: null,
    error: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setState((prev) => ({ ...prev, isSupported: false }));
      return;
    }

    setState((prev) => ({ ...prev, isSupported: true }));

    async function registerSW() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        registration.addEventListener('updatefound', () => {
          setState((prev) => ({ ...prev, isUpdating: true }));

          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState((prev) => ({ ...prev, isUpdating: false }));
              }
            });
          }
        });

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error('Registration failed'),
        }));
      }
    }

    registerSW();
  }, []);

  const skipWaiting = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [state.registration]);

  const clearCache = useCallback(async () => {
    if (state.registration) {
      await caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
  }, [state.registration]);

  const requestSync = useCallback(
    async (tag: string = 'sync-assertions') => {
      try {
        if ('sync' in ServiceWorkerRegistration.prototype && state.registration) {
          await (
            state.registration as unknown as {
              sync: { register: (tag: string) => Promise<void> };
            }
          ).sync.register(tag);
          return true;
        }
      } catch {
        // Sync not supported
      }
      return false;
    },
    [state.registration],
  );

  return {
    ...state,
    skipWaiting,
    clearCache,
    requestSync,
    reload: () => window.location.reload(),
  };
}

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000,
): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isOnline = useOfflineStatus();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const cacheKey = `cache:${key}`;
    const cacheTimestampKey = `cache-ts:${key}`;

    try {
      if (!isOnline) {
        const cached = localStorage.getItem(cacheKey);
        const timestamp = localStorage.getItem(cacheTimestampKey);

        if (cached && timestamp) {
          const age = Date.now() - parseInt(timestamp, 10);
          if (age < ttl) {
            setData(JSON.parse(cached));
            setIsLoading(false);
            return;
          }
        }
        throw new Error('Offline - No cached data available');
      }

      const result = await fetcher();

      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
        localStorage.setItem(cacheTimestampKey, Date.now().toString());
      } catch {
        // LocalStorage may be full
      }

      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fetch failed');

      if (!data) {
        setError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, ttl, isOnline, data]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
