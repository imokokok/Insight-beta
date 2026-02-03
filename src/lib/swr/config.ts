import type { SWRConfiguration } from 'swr';

// ============================================================================
// SWR Configuration Profiles
// 不同场景下的 SWR 配置优化
// ============================================================================

/**
 * 实时数据配置 - 价格、统计等需要频繁更新的数据
 */
export const realTimeSWRConfig: SWRConfiguration = {
  refreshInterval: 5000, // 5秒刷新
  dedupingInterval: 2000, // 2秒内重复请求去重
  revalidateOnFocus: false, // 聚焦时不重新验证，避免闪烁
  revalidateOnReconnect: true, // 重连时重新验证
  revalidateIfStale: true, // 过期数据时重新验证
  errorRetryCount: 3, // 错误重试3次
  errorRetryInterval: 1000, // 错误重试间隔1秒
  shouldRetryOnError: true, // 错误时重试
  keepPreviousData: true, // 保持旧数据避免闪烁
  suspense: false, // 不使用 Suspense
  focusThrottleInterval: 5000, // 聚焦节流5秒
};

/**
 * 配置数据 - 不经常变化的数据
 */
export const configSWRConfig: SWRConfiguration = {
  refreshInterval: 0, // 不自动刷新
  dedupingInterval: 60000, // 1分钟去重
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  revalidateIfStale: false, // 不自动重新验证过期数据
  errorRetryCount: 3,
  errorRetryInterval: 2000,
  shouldRetryOnError: true,
  keepPreviousData: true,
  suspense: false,
};

/**
 * 用户数据配置 - 个人相关数据
 */
export const userSWRConfig: SWRConfiguration = {
  refreshInterval: 30000, // 30秒刷新
  dedupingInterval: 5000, // 5秒去重
  revalidateOnFocus: true, // 聚焦时刷新（用户可能切换回页面）
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  shouldRetryOnError: true,
  keepPreviousData: true,
  suspense: false,
  focusThrottleInterval: 10000, // 聚焦节流10秒
};

/**
 * 列表数据配置 - 分页、无限滚动
 */
export const listSWRConfig: SWRConfiguration = {
  refreshInterval: 0, // 不自动刷新，手动刷新
  dedupingInterval: 2000,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  shouldRetryOnError: true,
  keepPreviousData: true, // 关键：保持旧数据避免滚动位置丢失
  suspense: false,
};

/**
 * 一次性数据配置 - 只需要加载一次的数据
 */
export const onceSWRConfig: SWRConfiguration = {
  refreshInterval: 0,
  dedupingInterval: 60000,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  errorRetryCount: 5, // 更多重试机会
  errorRetryInterval: 2000,
  shouldRetryOnError: true,
  keepPreviousData: true,
  suspense: false,
};

/**
 * 乐观更新配置 - 需要快速响应的交互
 */
export const optimisticSWRConfig: SWRConfiguration = {
  refreshInterval: 0,
  dedupingInterval: 1000,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  errorRetryCount: 3,
  errorRetryInterval: 500,
  shouldRetryOnError: true,
  keepPreviousData: true,
  suspense: false,
};

// ============================================================================
// SWR Global Configuration
// ============================================================================

export const globalSWRConfig: SWRConfiguration = {
  provider: () => new Map(),
  isOnline: () => (typeof navigator !== 'undefined' ? navigator.onLine : true),
  isVisible: () => (typeof document !== 'undefined' ? !document.hidden : true),
  initFocus: (callback: () => void) => {
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', callback);
      return () => window.removeEventListener('focus', callback);
    }
    return () => {};
  },
  initReconnect: (callback: () => void) => {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', callback);
      return () => window.removeEventListener('online', callback);
    }
    return () => {};
  },
};

// ============================================================================
// Request Deduplication Helper
// ============================================================================

const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * 请求去重包装器
 * 相同请求在指定时间内只发送一次
 */
export function dedupeRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  ttl: number = 2000,
): Promise<T> {
  const existing = pendingRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = requestFn().finally(() => {
    setTimeout(() => {
      pendingRequests.delete(key);
    }, ttl);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// ============================================================================
// Cache Key Helpers
// ============================================================================

export const swrCacheKeys = {
  oracle: {
    stats: (instanceId?: string) => (instanceId ? `oracle:stats:${instanceId}` : 'oracle:stats'),
    assertions: (filters: Record<string, string>) => `oracle:assertions:${JSON.stringify(filters)}`,
    config: (protocol: string) => `oracle:config:${protocol}`,
  },
  price: {
    current: (symbol: string, chain?: string) => `price:current:${symbol}:${chain || 'all'}`,
    history: (symbol: string, timeframe: string) => `price:history:${symbol}:${timeframe}`,
    comparison: (symbol: string) => `price:comparison:${symbol}`,
  },
  user: {
    profile: (address: string) => `user:profile:${address}`,
    stats: (address: string) => `user:stats:${address}`,
    watchlist: (address: string) => `user:watchlist:${address}`,
  },
  protocol: {
    info: (protocol: string) => `protocol:info:${protocol}`,
    feeds: (protocol: string, chain?: string) => `protocol:feeds:${protocol}:${chain || 'all'}`,
  },
};

// ============================================================================
// Mutation Configuration
// ============================================================================

export const mutationConfig = {
  // 乐观更新配置
  optimistic: {
    rollbackOnError: true,
    throwOnError: false,
  },
  // 重试配置
  retry: {
    retryCount: 3,
    retryInterval: 1000,
  },
};
