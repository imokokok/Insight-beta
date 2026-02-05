/**
 * Performance Monitor Hook
 *
 * 性能监控和指标收集
 * - Core Web Vitals 监控
 * - 资源加载时间
 * - 长任务检测
 * - 内存使用监控
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  inp: number | null; // Interaction to Next Paint

  // 自定义指标
  tti: number | null; // Time to Interactive
  fmp: number | null; // First Meaningful Paint

  // 资源加载
  resourceCount: number;
  resourceSize: number;
  slowResources: Array<{ name: string; duration: number }>;

  // 内存使用
  memoryUsed: number | null;
  memoryTotal: number | null;

  // 长任务
  longTasks: number;
  longTaskDuration: number;
}

interface UsePerformanceMonitorReturn {
  metrics: PerformanceMetrics;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  reportMetrics: () => void;
}

const initialMetrics: PerformanceMetrics = {
  lcp: null,
  fid: null,
  cls: null,
  fcp: null,
  ttfb: null,
  inp: null,
  tti: null,
  fmp: null,
  resourceCount: 0,
  resourceSize: 0,
  slowResources: [],
  memoryUsed: null,
  memoryTotal: null,
  longTasks: 0,
  longTaskDuration: 0,
};

export function usePerformanceMonitor(): UsePerformanceMonitorReturn {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(initialMetrics);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const observersRef = useRef<PerformanceObserver[]>([]);
  const longTaskObserverRef = useRef<PerformanceObserver | null>(null);

  // 收集 Core Web Vitals
  const collectWebVitals = useCallback(() => {
    if (typeof window === 'undefined') return;

    // LCP
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      setMetrics((prev) => ({ ...prev, lcp: lastEntry.startTime }));
      logger.debug('LCP measured', { value: lastEntry.startTime });
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    observersRef.current.push(lcpObserver);

    // FID
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEntry & { processingStart: number; startTime: number };
        const value = fidEntry.processingStart - fidEntry.startTime;
        setMetrics((prev) => ({ ...prev, fid: value }));
        logger.debug('FID measured', { value });
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
    observersRef.current.push(fidObserver);

    // CLS
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const clsEntry = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value;
          setMetrics((prev) => ({ ...prev, cls: clsValue }));
        }
      });
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    observersRef.current.push(clsObserver);

    // FCP
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          const fcpEntry = entry as PerformanceEntry & { startTime: number };
          setMetrics((prev) => ({ ...prev, fcp: fcpEntry.startTime }));
          logger.debug('FCP measured', { value: fcpEntry.startTime });
        }
      });
    });
    fcpObserver.observe({ entryTypes: ['paint'] });
    observersRef.current.push(fcpObserver);

    // TTFB
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const ttfb = navigation.responseStart - navigation.startTime;
      setMetrics((prev) => ({ ...prev, ttfb }));
      logger.debug('TTFB measured', { value: ttfb });
    }
  }, []);

  // 收集资源加载指标
  const collectResourceMetrics = useCallback(() => {
    if (typeof window === 'undefined') return;

    const resources = performance.getEntriesByType('resource');
    let totalSize = 0;
    const slowResources: Array<{ name: string; duration: number }> = [];

    resources.forEach((resource) => {
      const res = resource as PerformanceResourceTiming;
      // 估算资源大小（使用 transferSize 或 encodedBodySize）
      totalSize += res.transferSize || res.encodedBodySize || 0;

      // 检测慢资源（>1s）
      if (res.duration > 1000) {
        slowResources.push({
          name: res.name.split('/').pop() || res.name,
          duration: Math.round(res.duration),
        });
      }
    });

    // 按耗时排序，取前10个
    slowResources.sort((a, b) => b.duration - a.duration);

    setMetrics((prev) => ({
      ...prev,
      resourceCount: resources.length,
      resourceSize: Math.round(totalSize / 1024), // KB
      slowResources: slowResources.slice(0, 10),
    }));
  }, []);

  // 监控长任务
  const monitorLongTasks = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!('PerformanceObserver' in window)) return;

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        let totalDuration = 0;

        entries.forEach((entry) => {
          const task = entry as PerformanceEntry & { duration: number };
          totalDuration += task.duration;
        });

        setMetrics((prev) => ({
          ...prev,
          longTasks: prev.longTasks + entries.length,
          longTaskDuration: prev.longTaskDuration + totalDuration,
        }));
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
      longTaskObserverRef.current = longTaskObserver;
    } catch (error) {
      logger.warn('Long task monitoring not supported', { error });
    }
  }, []);

  // 监控内存使用
  const monitorMemory = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!('memory' in performance)) return;

    const memory = (
      performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }
    ).memory;
    if (memory) {
      setMetrics((prev) => ({
        ...prev,
        memoryUsed: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        memoryTotal: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
      }));
    }
  }, []);

  // 报告指标
  const reportMetrics = useCallback(() => {
    collectResourceMetrics();
    monitorMemory();

    logger.info('Performance Metrics', {
      ...metrics,
      timestamp: new Date().toISOString(),
    });

    // 可以发送到分析服务
    if (
      typeof window !== 'undefined' &&
      (
        window as unknown as {
          gtag?: (cmd: string, name: string, params: Record<string, unknown>) => void;
        }
      ).gtag
    ) {
      // Google Analytics 4
      (
        window as unknown as {
          gtag: (cmd: string, name: string, params: Record<string, unknown>) => void;
        }
      ).gtag('event', 'web_vitals', {
        lcp: metrics.lcp,
        fid: metrics.fid,
        cls: metrics.cls,
        fcp: metrics.fcp,
        ttfb: metrics.ttfb,
      });
    }
  }, [metrics, collectResourceMetrics, monitorMemory]);

  // 开始监控
  const startMonitoring = useCallback(() => {
    if (typeof window === 'undefined') return;

    setIsMonitoring(true);
    collectWebVitals();
    monitorLongTasks();

    // 定期收集资源指标
    const interval = setInterval(() => {
      collectResourceMetrics();
      monitorMemory();
    }, 30000);

    // 页面卸载前报告
    const handleBeforeUnload = () => {
      reportMetrics();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [collectWebVitals, monitorLongTasks, collectResourceMetrics, monitorMemory, reportMetrics]);

  // 停止监控
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);

    // 断开所有观察者
    observersRef.current.forEach((observer) => observer.disconnect());
    observersRef.current = [];

    if (longTaskObserverRef.current) {
      longTaskObserverRef.current.disconnect();
      longTaskObserverRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    reportMetrics,
  };
}

/**
 * 测量自定义性能标记
 */
export function measurePerformance(name: string, startMark?: string, endMark?: string): number {
  if (typeof window === 'undefined') return 0;

  try {
    if (startMark && endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.mark(name);
    }

    const entries = performance.getEntriesByName(name, 'measure');
    const duration = entries[entries.length - 1]?.duration || 0;

    logger.debug('Performance measure', { name, duration });
    return duration;
  } catch (error) {
    logger.error('Performance measure failed', { error, name });
    return 0;
  }
}

/**
 * 获取页面加载时间
 */
export function getPageLoadTime(): number {
  if (typeof window === 'undefined') return 0;

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navigation) {
    return navigation.loadEventEnd - navigation.startTime;
  }

  return performance.now();
}

/**
 * 检查性能是否达标
 */
export function checkPerformanceBudget(metrics: PerformanceMetrics): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (metrics.lcp && metrics.lcp > 2500) {
    issues.push(`LCP (${Math.round(metrics.lcp)}ms) exceeds budget (2500ms)`);
  }

  if (metrics.fid && metrics.fid > 100) {
    issues.push(`FID (${Math.round(metrics.fid)}ms) exceeds budget (100ms)`);
  }

  if (metrics.cls && metrics.cls > 0.1) {
    issues.push(`CLS (${metrics.cls.toFixed(3)}) exceeds budget (0.1)`);
  }

  if (metrics.fcp && metrics.fcp > 1800) {
    issues.push(`FCP (${Math.round(metrics.fcp)}ms) exceeds budget (1800ms)`);
  }

  if (metrics.ttfb && metrics.ttfb > 800) {
    issues.push(`TTFB (${Math.round(metrics.ttfb)}ms) exceeds budget (800ms)`);
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
