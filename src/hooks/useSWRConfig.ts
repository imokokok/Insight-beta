/**
 * SWR Configuration - 统一的 SWR 配置
 *
 * 集中管理 SWR 的默认配置，避免重复
 */

import { CACHE_CONFIG } from '@/config/constants';

import type useSWR from 'swr';
import type useSWRInfinite from 'swr/infinite';

// ============================================================================
// SWR 默认配置
// ============================================================================

const SWR_DEFAULT_CONFIG = {
  refreshInterval: CACHE_CONFIG.DEFAULT_REFRESH_INTERVAL,
  dedupingInterval: CACHE_CONFIG.DEFAULT_DEDUPING_INTERVAL,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  revalidateIfStale: false,
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  shouldRetryOnError: true,
  keepPreviousData: true,
  suspense: false,
} as const;

// ============================================================================
// SWR 配置选项类型
// ============================================================================

interface UseSWRConfigOptions {
  refreshInterval?: number | ((latestData: unknown) => number);
  dedupingInterval?: number;
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  revalidateIfStale?: boolean;
  errorRetryCount?: number;
  errorRetryInterval?: number;
  shouldRetryOnError?: boolean;
  keepPreviousData?: boolean;
  suspense?: boolean;
}

interface UseSWRInfiniteConfigOptions {
  refreshInterval?: number;
  dedupingInterval?: number;
  revalidateOnFocus?: boolean;
  revalidateFirstPage?: boolean;
  revalidateAll?: boolean;
  errorRetryCount?: number;
  errorRetryInterval?: number;
  shouldRetryOnError?: boolean;
}

// ============================================================================
// SWR 配置工厂函数
// ============================================================================

export function createSWRConfig<T>(
  options: UseSWRConfigOptions = {},
): Parameters<typeof useSWR<T>>[2] {
  return {
    ...SWR_DEFAULT_CONFIG,
    ...options,
  };
}

export function createSWRInfiniteConfig(
  options: UseSWRInfiniteConfigOptions = {},
): Parameters<typeof useSWRInfinite>[2] {
  return {
    revalidateFirstPage: false,
    revalidateOnFocus: false,
    revalidateAll: false,
    refreshInterval: 0,
    dedupingInterval: CACHE_CONFIG.DEFAULT_DEDUPING_INTERVAL,
    revalidateOnReconnect: true,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    shouldRetryOnError: true,
    ...options,
  };
}

// ============================================================================
// 实时数据配置
// ============================================================================

export const REALTIME_CONFIG = {
  refreshInterval: 5000, // 5秒
  dedupingInterval: 1000, // 1秒
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  errorRetryCount: 5,
  errorRetryInterval: 2000,
} as const;
