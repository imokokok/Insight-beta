/**
 * Smart Refresh Component
 *
 * 智能刷新组件 - 支持后台静默刷新、离线检测、自动重试
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, WifiOff, AlertCircle } from 'lucide-react';

import { useToast } from '@/components/ui/toast';
import { cn } from '@/shared/utils';

interface SmartRefreshOptions {
  interval?: number; // 刷新间隔（毫秒）
  retryAttempts?: number; // 重试次数
  retryDelay?: number; // 重试延迟（毫秒）
  backgroundRefresh?: boolean; // 是否后台刷新
  showToast?: boolean; // 是否显示刷新提示
}

interface UseSmartRefreshReturn<T> {
  data: T | null;
  isLoading: boolean;
  isBackgroundRefreshing: boolean;
  isOffline: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  retryCount: number;
}

export function useSmartRefresh<T>(
  fetchFn: () => Promise<T>,
  options: SmartRefreshOptions = {}
): UseSmartRefreshReturn<T> {
  const {
    interval = 60000,
    retryAttempts = 3,
    retryDelay = 2000,
    backgroundRefresh = true,
    showToast = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (showToast) {
        toast({
          title: '网络已恢复',
          message: '正在同步最新数据...',
          type: 'success',
          duration: 3000,
        });
      }
      refresh();
    };

    const handleOffline = () => {
      setIsOffline(true);
      if (showToast) {
        toast({
          title: '网络已断开',
          message: '请检查网络连接',
          type: 'warning',
          duration: 5000,
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast, toast]);

  const fetchWithRetry = useCallback(async (
    attempt: number = 0,
    isBackground: boolean = false
  ): Promise<T | null> => {
    try {
      if (!isBackground) {
        setIsLoading(true);
      } else {
        setIsBackgroundRefreshing(true);
      }
      setError(null);

      const result = await fetchFn();
      
      setData(result);
      setLastUpdated(new Date());
      setRetryCount(0);

      if (isBackground && showToast) {
        toast({
          title: '数据已更新',
          message: '最新数据已同步',
          type: 'success',
          duration: 2000,
        });
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);

      if (attempt < retryAttempts && !isBackground) {
        setRetryCount(attempt + 1);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        return fetchWithRetry(attempt + 1, isBackground);
      }

      if (showToast && !isBackground) {
        toast({
          title: '刷新失败',
          message: error.message || '请稍后重试',
          type: 'error',
          duration: 5000,
        });
      }

      return null;
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      } else {
        setIsBackgroundRefreshing(false);
      }
    }
  }, [fetchFn, retryAttempts, retryDelay, showToast, toast]);

  const refresh = useCallback(async () => {
    await fetchWithRetry(0, false);
  }, [fetchWithRetry]);

  // Auto refresh interval
  useEffect(() => {
    if (interval > 0 && !isOffline) {
      intervalRef.current = setInterval(() => {
        fetchWithRetry(0, backgroundRefresh);
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [interval, isOffline, backgroundRefresh, fetchWithRetry]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, []);

  return {
    data,
    isLoading,
    isBackgroundRefreshing,
    isOffline,
    error,
    lastUpdated,
    refresh,
    retryCount,
  };
}

// Smart Refresh Indicator Component
interface SmartRefreshIndicatorProps {
  lastUpdated: Date | null;
  isLoading: boolean;
  isBackgroundRefreshing: boolean;
  isOffline: boolean;
  error: Error | null;
  onRefresh: () => void;
  className?: string;
  compact?: boolean;
}

export function SmartRefreshIndicator({
  lastUpdated,
  isLoading,
  isBackgroundRefreshing,
  isOffline,
  error,
  onRefresh,
  className,
  compact = false,
}: SmartRefreshIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState('');
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastUpdated) {
        setTimeAgo('从未');
        return;
      }

      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (seconds < 5) {
        setTimeAgo('刚刚');
      } else if (seconds < 60) {
        setTimeAgo(`${seconds}秒前`);
      } else if (seconds < 3600) {
        setTimeAgo(`${Math.floor(seconds / 60)}分钟前`);
      } else if (seconds < 86400) {
        setTimeAgo(`${Math.floor(seconds / 3600)}小时前`);
      } else {
        setTimeAgo(`${Math.floor(seconds / 86400)}天前`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  useEffect(() => {
    if (isLoading || isBackgroundRefreshing) {
      setCountdown(60);
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 60 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading, isBackgroundRefreshing]);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <AnimatePresence mode="wait">
          {isOffline ? (
            <motion.div
              key="offline"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 text-amber-600"
            >
              <WifiOff className="h-4 w-4" />
              <span className="text-xs">离线</span>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 text-rose-600"
            >
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs">错误</span>
            </motion.div>
          ) : (
            <motion.div
              key="normal"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 text-gray-500"
            >
              <RefreshCw
                className={cn(
                  'h-4 w-4',
                  (isLoading || isBackgroundRefreshing) && 'animate-spin'
                )}
              />
              <span className="text-xs">{timeAgo}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm',
        isOffline
          ? 'border-amber-200 bg-amber-50'
          : error
          ? 'border-rose-200 bg-rose-50'
          : 'border-gray-200 bg-white',
        className
      )}
    >
      <AnimatePresence mode="wait">
        {isOffline ? (
          <motion.div
            key="offline"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 text-amber-700"
          >
            <WifiOff className="h-4 w-4" />
            <span>网络已断开</span>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 text-rose-700"
          >
            <AlertCircle className="h-4 w-4" />
            <span>刷新失败</span>
          </motion.div>
        ) : (
          <motion.div
            key="normal"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 text-gray-600"
          >
            <RefreshCw
              className={cn(
                'h-4 w-4',
                (isLoading || isBackgroundRefreshing) && 'animate-spin'
              )}
            />
            <span>更新于 {timeAgo}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-4 w-px bg-gray-300" />

      <button
        onClick={onRefresh}
        disabled={isLoading || isOffline}
        className="flex items-center gap-1.5 text-blue-600 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        <span>立即刷新</span>
      </button>

      {!isOffline && !error && (
        <>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-xs">下次刷新</span>
            <div className="relative h-5 w-5">
              <svg className="h-5 w-5 -rotate-90" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(countdown / 60) * 63} 63`}
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                {countdown}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Pull to Refresh Hook for mobile
interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPullDistance?: number;
}

export function usePullToRefresh(options: UsePullToRefreshOptions) {
  const { onRefresh, threshold = 80, maxPullDistance = 120 } = options;
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      const touch = e.touches[0];
      if (touch) {
        startY.current = touch.clientY;
        isPulling.current = true;
      }
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling.current) return;

      const touch = e.touches[0];
      if (!touch) return;

      const currentY = touch.clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && window.scrollY === 0) {
        e.preventDefault();
        const dampedDistance = Math.min(diff * 0.5, maxPullDistance);
        setPullDistance(dampedDistance);
      }
    },
    [maxPullDistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;

    isPulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }

    setPullDistance(0);
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing };
}

// Pull to Refresh Visual Component
interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
  className?: string;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 80,
  className,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return (
    <motion.div
      className={cn(
        'fixed left-0 right-0 z-50 flex items-center justify-center overflow-hidden',
        className
      )}
      style={{
        top: 0,
        height: pullDistance,
      }}
      animate={{
        opacity: pullDistance > 0 ? 1 : 0,
      }}
    >
      <div className="flex flex-col items-center gap-2">
        <motion.div
          animate={{
            rotate: isRefreshing ? 360 : progress * 180,
            scale: shouldTrigger && !isRefreshing ? 1.2 : 1,
          }}
          transition={{
            rotate: isRefreshing
              ? { duration: 1, repeat: Infinity, ease: 'linear' }
              : { type: 'spring', stiffness: 300 },
          }}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            shouldTrigger ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
          )}
        >
          <RefreshCw className="h-5 w-5" />
        </motion.div>
        <span className="text-xs text-gray-500">
          {isRefreshing
            ? '刷新中...'
            : shouldTrigger
            ? '松开刷新'
            : '下拉刷新'}
        </span>
      </div>
    </motion.div>
  );
}
