/**
 * Performance Utilities - 性能优化工具库
 *
 * 提供各种性能优化工具函数和 Hooks
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';

// ============================================================================
// 防抖和节流
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================================================
// 性能监控 Hook
// ============================================================================

interface PerformanceMetrics {
  renderCount: number;
  renderTime: number;
  lastRenderTime: number;
  mountTime: number;
}

export function usePerformanceMonitor(componentName: string) {
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    renderTime: 0,
    lastRenderTime: 0,
    mountTime: 0,
  });
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const mountStart = performance.now();
    metricsRef.current.mountTime = performance.now() - mountStart;

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Performance] ${componentName} mounted in ${metricsRef.current.mountTime.toFixed(2)}ms`,
      );
    }

    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Performance] ${componentName} unmounted. Total renders: ${metricsRef.current.renderCount}`,
        );
      }
    };
  }, [componentName]);

  const startMeasure = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const endMeasure = useCallback(() => {
    const endTime = performance.now();
    metricsRef.current.renderTime = endTime - startTimeRef.current;
    metricsRef.current.lastRenderTime = endTime;
    metricsRef.current.renderCount++;

    if (process.env.NODE_ENV === 'development' && metricsRef.current.renderTime > 16) {
      console.warn(
        `[Performance] ${componentName} render took ${metricsRef.current.renderTime.toFixed(2)}ms (>${16}ms)`,
      );
    }
  }, [componentName]);

  return { metrics: metricsRef.current, startMeasure, endMeasure };
}

// ============================================================================
// 虚拟滚动 Hook
// ============================================================================

interface UseVirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
  containerHeight: number;
}

export function useVirtualScroll({
  itemCount,
  itemHeight,
  overscan = 5,
  containerHeight,
}: UseVirtualScrollOptions) {
  const [scrollTop, setScrollTop] = useState(0);

  const { virtualItems, totalHeight, startIndex, endIndex } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(itemCount - 1, startIndex + visibleCount + overscan * 2);

    const virtualItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
      virtualItems.push({
        index: i,
        style: {
          position: 'absolute',
          top: i * itemHeight,
          height: itemHeight,
          left: 0,
          right: 0,
        },
      });
    }

    return {
      virtualItems,
      totalHeight: itemCount * itemHeight,
      startIndex,
      endIndex,
    };
  }, [scrollTop, itemCount, itemHeight, overscan, containerHeight]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return { virtualItems, totalHeight, startIndex, endIndex, onScroll };
}

// ============================================================================
// 数据分片处理
// ============================================================================

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function processInChunks<T, R>(
  items: T[],
  processor: (chunk: T[]) => R[],
  chunkSize: number = 100,
  onProgress?: (progress: number) => void,
): Promise<R[]> {
  const chunks = chunkArray(items, chunkSize);
  const results: R[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk) {
      const chunkResults = processor(chunk);
      results.push(...chunkResults);
    }

    if (onProgress) {
      onProgress((i + 1) / chunks.length);
    }

    // 让出主线程
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return results;
}

// ============================================================================
// 记忆化计算
// ============================================================================

export function createMemoizedCalculator<T, R>(
  calculator: (input: T) => R,
  keyGenerator?: (input: T) => string,
) {
  const cache = new Map<string, R>();

  return (input: T): R => {
    const key = keyGenerator ? keyGenerator(input) : JSON.stringify(input);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = calculator(input);
    cache.set(key, result);
    return result;
  };
}

// ============================================================================
// RAF 调度器
// ============================================================================

export function scheduleOnFrame(callback: () => void): () => void {
  let rafId: number;
  let cancelled = false;

  const schedule = () => {
    rafId = requestAnimationFrame(() => {
      if (!cancelled) {
        callback();
      }
    });
  };

  schedule();

  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}

// ============================================================================
// 懒加载 Hook
// ============================================================================

import { useState } from 'react';

export function useLazyLoad<T>(
  loader: () => Promise<T>,
  options?: { threshold?: number; rootMargin?: string },
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasLoaded) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        const firstEntry = entries[0];
        if (firstEntry && firstEntry.isIntersecting && !hasLoaded) {
          setIsLoading(true);
          try {
            const result = await loader();
            setData(result);
            setHasLoaded(true);
          } catch (error) {
            logger.error('Lazy load failed', {
              error: error instanceof Error ? error.message : String(error),
            });
          } finally {
            setIsLoading(false);
          }
        }
      },
      {
        threshold: options?.threshold ?? 0.1,
        rootMargin: options?.rootMargin ?? '50px',
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [loader, hasLoaded, options]);

  return { ref, data, isLoading, hasLoaded };
}

// ============================================================================
// 内存管理
// ============================================================================

export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 移动到末尾（最近使用）
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 删除最旧的
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// 批量更新
// ============================================================================

export function useBatchedState<T>(
  initialState: T,
  batchSize: number = 100,
  delay: number = 16,
): [T, (updater: (prev: T) => T) => void, boolean] {
  const [state, setState] = useState(initialState);
  const [isBatching, setIsBatching] = useState(false);
  const batchRef = useRef<((prev: T) => T)[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushBatch = useCallback(() => {
    if (batchRef.current.length === 0) return;

    setState((prev) => {
      let newState = prev;
      batchRef.current.forEach((updater) => {
        newState = updater(newState);
      });
      return newState;
    });

    batchRef.current = [];
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsBatching(false);
  }, []);

  const updateState = useCallback(
    (updater: (prev: T) => T) => {
      batchRef.current.push(updater);

      if (batchRef.current.length >= batchSize) {
        flushBatch();
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(flushBatch, delay);
      }

      setIsBatching(true);
    },
    [batchSize, delay, flushBatch],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, updateState, isBatching];
}
