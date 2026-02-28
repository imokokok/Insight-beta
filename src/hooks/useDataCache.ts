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

interface CacheData<T> {
  data: T;
  timestamp: number;
}

function isValidCacheData<T>(value: unknown): value is CacheData<T> {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.timestamp !== 'number') return false;
  if (!('data' in obj)) return false;
  return true;
}

export function useDataCache<T extends Record<string, unknown>>({
  key,
  ttl = 5 * 60 * 1000,
}: CacheOptions) {
  const getCachedData = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const parsed: unknown = JSON.parse(cached);

      if (!isValidCacheData<T>(parsed)) {
        logger.warn('Invalid cache data structure, clearing cache', { key });
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      const { data, timestamp } = parsed;
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
