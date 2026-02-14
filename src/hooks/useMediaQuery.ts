'use client';

import { useSyncExternalStore } from 'react';

const getSnapshot = (query: string): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(query).matches;
};

function createMediaQueryStore(query: string) {
  const listeners = new Set<() => void>();
  let snapshot = getSnapshot(query);

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => false,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      const media = typeof window !== 'undefined' ? window.matchMedia(query) : null;
      const handleChange = () => {
        snapshot = getSnapshot(query);
        listeners.forEach((l) => l());
      };
      media?.addEventListener('change', handleChange);
      return () => {
        listeners.delete(listener);
        media?.removeEventListener('change', handleChange);
      };
    },
  };
}

const mediaQueryStores = new Map<string, ReturnType<typeof createMediaQueryStore>>();

function getMediaQueryStore(query: string) {
  if (!mediaQueryStores.has(query)) {
    mediaQueryStores.set(query, createMediaQueryStore(query));
  }
  return mediaQueryStores.get(query)!;
}

/**
 * 媒体查询 Hook
 */
export function useMediaQuery(query: string): boolean {
  const store = getMediaQueryStore(query);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

/**
 * 大屏幕检测 Hook (1280px+)
 */
export function useIsLargeScreen(): boolean {
  return useMediaQuery('(min-width: 1280px)');
}

/**
 * 移动设备检测 Hook (768px-)
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}
