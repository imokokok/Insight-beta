/**
 * SWR Configuration - 统一的 SWR 配置
 *
 * 集中管理 SWR 的默认配置，避免重复
 */

import { CACHE_CONFIG } from '@/lib/config/constants';

import type useSWR from 'swr';
import type useSWRInfinite from 'swr/infinite';


// ============================================================================
// SWR 默认配置
// ============================================================================

export const SWR_DEFAULT_CONFIG = {
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
// SWR 配置 Hook
// ============================================================================

export interface UseSWRConfigOptions {
  refreshInterval?: number;
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

export function useSWRConfig(options: UseSWRConfigOptions = {}) {
  return {
    ...SWR_DEFAULT_CONFIG,
    ...options,
  };
}

// ============================================================================
// SWR Infinite 配置
// ============================================================================

export interface UseSWRInfiniteConfigOptions {
  refreshInterval?: number;
  dedupingInterval?: number;
  revalidateOnFocus?: boolean;
  revalidateFirstPage?: boolean;
  revalidateAll?: boolean;
  errorRetryCount?: number;
  errorRetryInterval?: number;
  shouldRetryOnError?: boolean;
}

export function useSWRInfiniteConfig(options: UseSWRInfiniteConfigOptions = {}) {
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
// SWR 配置工厂函数
// ============================================================================

export function createSWRConfig<T>(
  options: UseSWRConfigOptions = {},
): Parameters<typeof useSWR<T>>[2] {
  return {
    ...SWR_DEFAULT_CONFIG,
    ...options,
  } as Parameters<typeof useSWR<T>>[2];
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

// ============================================================================
// 慢速数据配置
// ============================================================================

export const SLOW_DATA_CONFIG = {
  refreshInterval: CACHE_CONFIG.DEFAULT_CACHE_TIME, // 5分钟
  dedupingInterval: CACHE_CONFIG.DEFAULT_CACHE_TIME,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  errorRetryCount: 1,
  errorRetryInterval: 5000,
} as const;

// ============================================================================
// 一次性数据配置
// ============================================================================

export const ONCE_CONFIG = {
  refreshInterval: 0,
  dedupingInterval: Infinity,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  errorRetryCount: 0,
  shouldRetryOnError: false,
} as const;
