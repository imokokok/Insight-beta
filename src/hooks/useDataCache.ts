/**
 * Data Cache Hook
 *
 * 基于 localStorage 的简单数据缓存
 */

'use client';

import { useCallback } from 'react';

import { logger } from '@/shared/logger';

interface CacheOptions {
  key: string;
  ttl?: number;
}

export function useDataCache<T extends Record<string, unknown>>({
  key,
  ttl = 5 * 60 * 1000,
}: CacheOptions) {
  const getCachedData = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();

      if (now - timestamp > ttl) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }, [key, ttl]);

  const setCachedData = useCallback(
    (data: T) => {
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
    },
    [key],
  );

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      logger.error('Failed to clear cache', { error, key });
    }
  }, [key]);

  return { getCachedData, setCachedData, clearCache };
}
