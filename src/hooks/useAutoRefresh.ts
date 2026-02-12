/**
 * useAutoRefresh Hook
 *
 * 自动刷新数据 Hook
 * 整合刷新策略配置，支持自动轮询和手动刷新
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getRefreshStrategy,
  formatLastUpdated,
  type RefreshStrategyConfig,
} from '@/config/refreshStrategy';
import { logger } from '@/lib/logger';

interface UseAutoRefreshOptions {
  /** 页面/视图 ID */
  pageId: string;
  /** 数据获取函数 */
  fetchFn: () => Promise<void>;
  /** 是否启用自动刷新 */
  enabled?: boolean;
  /** 自定义刷新间隔（覆盖默认配置） */
  interval?: number;
}

interface UseAutoRefreshReturn {
  /** 最后更新时间 */
  lastUpdated: Date | null;
  /** 是否正在刷新 */
  isRefreshing: boolean;
  /** 是否出错 */
  isError: boolean;
  /** 错误对象 */
  error: Error | null;
  /** 刷新策略配置 */
  strategy: RefreshStrategyConfig;
  /** 手动刷新 */
  refresh: () => Promise<void>;
  /** 格式化后的最后更新时间 */
  formattedLastUpdated: string;
}

/**
 * 自动刷新 Hook
 *
 * @example
 * const { lastUpdated, isRefreshing, refresh, strategy } = useAutoRefresh({
 *   pageId: 'dashboard-overview',
 *   fetchFn: async () => {
 *     const data = await fetchDashboardData();
 *     setData(data);
 *   },
 * });
 */
export function useAutoRefresh(options: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const { pageId, fetchFn, enabled = true, interval: customInterval } = options;

  // 获取刷新策略配置
  const strategy = getRefreshStrategy(pageId);

  // 状态
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [formattedLastUpdated, setFormattedLastUpdated] = useState(() => formatLastUpdated(null));

  // 使用 ref 存储 interval，避免闭包问题
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isRefreshingRef = useRef(false);

  // 刷新函数
  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setIsError(false);
    setError(null);
    try {
      await fetchFn();
      if (isMountedRef.current) {
        setLastUpdated(new Date());
      }
    } catch (err) {
      logger.error('Refresh failed', { error: err });
      if (isMountedRef.current) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      isRefreshingRef.current = false;
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [fetchFn]);

  // 初始加载
  useEffect(() => {
    // 添加错误处理，防止未处理的 Promise 拒绝
    refresh().catch(() => {
      // 错误已在 refresh 函数内部处理
    });
  }, [refresh]);

  // 自动轮询
  useEffect(() => {
    if (!enabled) return;

    // 确定轮询间隔
    const pollInterval = customInterval ?? strategy.interval;

    // 如果间隔为 0，不启动轮询
    if (pollInterval === 0) return;

    // 启动轮询
    intervalRef.current = setInterval(() => {
      refresh();
    }, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, strategy.interval, customInterval, refresh]);

  // 更新格式化时间
  useEffect(() => {
    setFormattedLastUpdated(formatLastUpdated(lastUpdated));

    const timeInterval = setInterval(() => {
      setFormattedLastUpdated(formatLastUpdated(lastUpdated));
    }, 1000);

    return () => clearInterval(timeInterval);
  }, [lastUpdated]);

  // 清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    lastUpdated,
    isRefreshing,
    isError,
    error,
    strategy,
    refresh,
    formattedLastUpdated,
  };
}
