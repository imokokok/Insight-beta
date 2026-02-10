/**
 * 网络恢复自动刷新 Hook
 *
 * 当网络从离线恢复为在线时，自动刷新数据
 */

import { useEffect, useRef, useCallback } from 'react';

import { logger } from '@/lib/logger';

/**
 * 刷新配置选项
 */
interface UseNetworkRefreshOptions {
  /** 刷新回调函数 */
  onRefresh: () => Promise<void> | void;
  /** 是否启用 */
  enabled?: boolean;
  /** 延迟时间（毫秒） */
  delay?: number;
  /** 最小离线时间才触发刷新（毫秒） */
  minOfflineDuration?: number;
  /** 是否显示刷新提示 */
  showToast?: boolean;
}

/**
 * 网络恢复自动刷新 Hook
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isRefreshing, lastRefreshTime } = useNetworkRefresh({
 *     onRefresh: async () => {
 *       await refetchData();
 *     },
 *     enabled: true,
 *     delay: 1000,
 *   });
 *
 *   return <div>{isRefreshing ? 'Refreshing...' : 'Data loaded'}</div>;
 * }
 * ```
 */
export function useNetworkRefresh(options: UseNetworkRefreshOptions) {
  const {
    onRefresh,
    enabled = true,
    delay = 1000,
    minOfflineDuration = 5000,
    showToast = true,
  } = options;

  const isOnlineRef = useRef(true);
  const offlineTimeRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);
  const lastRefreshTimeRef = useRef<number | null>(null);

  const performRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    logger.info('Network recovered, refreshing data...');

    try {
      await onRefresh();
      lastRefreshTimeRef.current = Date.now();

      if (showToast) {
        // 可以在这里显示 toast 通知
        logger.info('Data refreshed successfully');
      }
    } catch (error) {
      logger.error('Failed to refresh data after network recovery', { error });
    } finally {
      isRefreshingRef.current = false;
    }
  }, [onRefresh, showToast]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleOnline = () => {
      if (!isOnlineRef.current) {
        isOnlineRef.current = true;

        // 检查离线时长
        const offlineDuration = offlineTimeRef.current ? Date.now() - offlineTimeRef.current : 0;

        if (offlineDuration >= minOfflineDuration) {
          // 延迟执行刷新，避免网络不稳定时频繁刷新
          setTimeout(() => {
            performRefresh();
          }, delay);
        }

        offlineTimeRef.current = null;
      }
    };

    const handleOffline = () => {
      if (isOnlineRef.current) {
        isOnlineRef.current = false;
        offlineTimeRef.current = Date.now();
      }
    };

    // 初始状态
    isOnlineRef.current = navigator.onLine;
    if (!isOnlineRef.current) {
      offlineTimeRef.current = Date.now();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, delay, minOfflineDuration, performRefresh]);

  return {
    isRefreshing: isRefreshingRef.current,
    lastRefreshTime: lastRefreshTimeRef.current,
    refresh: performRefresh,
  };
}

/**
 * 全局网络恢复刷新管理器
 *
 * 管理多个组件的刷新回调，避免重复刷新
 */
class NetworkRefreshManager {
  private callbacks: Map<string, () => Promise<void>> = new Map();
  private isOnline = true;
  private offlineTime: number | null = null;
  private isRefreshing = false;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      if (!this.isOnline) {
        this.isOnline = true;
        this.handleNetworkRecovery();
      }
    };

    const handleOffline = () => {
      if (this.isOnline) {
        this.isOnline = false;
        this.offlineTime = Date.now();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    this.isOnline = navigator.onLine;
  }

  private async handleNetworkRecovery() {
    if (this.isRefreshing || this.callbacks.size === 0) return;

    const offlineDuration = this.offlineTime ? Date.now() - this.offlineTime : 0;
    if (offlineDuration < 5000) return;

    this.isRefreshing = true;
    logger.info('Network recovered, refreshing all registered components...');

    // 延迟执行，等待网络稳定
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const promises = Array.from(this.callbacks.values()).map(async (callback) => {
      try {
        await callback();
      } catch (error) {
        logger.error('Refresh callback failed', { error });
      }
    });

    await Promise.all(promises);

    this.isRefreshing = false;
    this.offlineTime = null;
    logger.info('All components refreshed');
  }

  /**
   * 注册刷新回调
   */
  register(id: string, callback: () => Promise<void>): () => void {
    this.callbacks.set(id, callback);

    // 返回取消注册函数
    return () => {
      this.callbacks.delete(id);
    };
  }

  /**
   * 手动触发所有刷新
   */
  async refreshAll(): Promise<void> {
    if (this.isRefreshing) return;

    this.isRefreshing = true;
    const promises = Array.from(this.callbacks.values()).map(async (callback) => {
      try {
        await callback();
      } catch (error) {
        logger.error('Refresh callback failed', { error });
      }
    });

    await Promise.all(promises);
    this.isRefreshing = false;
  }
}

// 单例实例
let refreshManager: NetworkRefreshManager | null = null;

export function getNetworkRefreshManager(): NetworkRefreshManager {
  if (!refreshManager) {
    refreshManager = new NetworkRefreshManager();
  }
  return refreshManager;
}

/**
 * 使用全局网络刷新管理器的 Hook
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isRefreshing } = useGlobalNetworkRefresh({
 *     id: 'my-component',
 *     onRefresh: async () => {
 *       await refetchData();
 *     },
 *   });
 *
 *   return <div>{isRefreshing ? 'Refreshing...' : 'Ready'}</div>;
 * }
 * ```
 */
export function useGlobalNetworkRefresh({
  id,
  onRefresh,
  enabled = true,
}: {
  id: string;
  onRefresh: () => Promise<void>;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;

    const manager = getNetworkRefreshManager();
    return manager.register(id, onRefresh);
  }, [id, onRefresh, enabled]);

  return {
    refreshAll: () => getNetworkRefreshManager().refreshAll(),
  };
}

export default useNetworkRefresh;
