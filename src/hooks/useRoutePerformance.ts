/**
 * Route Performance Hook - 路由性能监控 Hook
 *
 * 用于监控路由切换性能和导航时间
 * - 路由切换时间测量
 * - Navigation Timing API 集成
 * - 性能指标上报
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { logger } from '@/lib/logger';

interface RouteMetrics {
  path: string;
  duration: number;
  timestamp: number;
  navigationType: 'navigate' | 'reload' | 'back_forward';
}

interface NavigationTimingMetrics {
  dnsTime: number;
  tcpTime: number;
  ttfb: number;
  domParseTime: number;
  loadTime: number;
  renderTime: number;
}

interface UseRoutePerformanceOptions {
  /** 是否启用监控 */
  enabled?: boolean;
  /** 慢路由阈值（毫秒） */
  slowRouteThreshold?: number;
  /** 上报回调 */
  onReport?: (metrics: RouteMetrics) => void;
  /** 是否上报到 analytics */
  reportToAnalytics?: boolean;
}

/**
 * 路由性能监控 Hook
 */
export function useRoutePerformance(options: UseRoutePerformanceOptions = {}) {
  const { enabled = true, slowRouteThreshold = 300, onReport, reportToAnalytics = false } = options;

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const startTimeRef = useRef<number>(0);
  const prevPathRef = useRef<string>('');

  // 收集 Navigation Timing 指标
  const collectNavigationTiming = useCallback((): NavigationTimingMetrics | null => {
    if (typeof window === 'undefined') return null;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return null;

    return {
      dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcpTime: navigation.connectEnd - navigation.connectStart,
      ttfb: navigation.responseStart - navigation.startTime,
      domParseTime:
        navigation.domComplete -
        ((navigation as unknown as { domLoading?: number }).domLoading || navigation.domComplete),
      loadTime: navigation.loadEventEnd - navigation.startTime,
      renderTime: navigation.domComplete - navigation.responseEnd,
    };
  }, []);

  // 上报路由指标
  const reportMetrics = useCallback(
    (metrics: RouteMetrics) => {
      // 记录到控制台
      logger.debug('[Route Performance]', {
        path: metrics.path,
        duration: `${metrics.duration.toFixed(2)}ms`,
        type: metrics.navigationType,
      });

      // 慢路由警告
      if (metrics.duration > slowRouteThreshold) {
        logger.warn('Slow route transition detected', {
          path: metrics.path,
          duration: `${metrics.duration.toFixed(2)}ms`,
          threshold: `${slowRouteThreshold}ms`,
        });
      }

      // 自定义回调
      onReport?.(metrics);

      // 上报到 Google Analytics
      if (
        reportToAnalytics &&
        typeof window !== 'undefined' &&
        (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
      ) {
        (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
          'event',
          'route_transition',
          {
            path: metrics.path,
            duration: Math.round(metrics.duration),
            navigation_type: metrics.navigationType,
          },
        );
      }
    },
    [slowRouteThreshold, onReport, reportToAnalytics],
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const currentPath = pathname + searchParams.toString();

    // 跳过首次渲染
    if (prevPathRef.current === '') {
      prevPathRef.current = currentPath;
      startTimeRef.current = performance.now();
      return;
    }

    // 路径变化时记录性能
    if (prevPathRef.current !== currentPath) {
      const duration = performance.now() - startTimeRef.current;

      // 获取导航类型
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      const navigationType =
        (navigation?.type as 'navigate' | 'reload' | 'back_forward') || 'navigate';

      const metrics: RouteMetrics = {
        path: currentPath,
        duration,
        timestamp: Date.now(),
        navigationType,
      };

      // 延迟上报以确保页面完全渲染
      if ('requestIdleCallback' in window) {
        (
          window as unknown as { requestIdleCallback: (callback: () => void) => number }
        ).requestIdleCallback(() => {
          reportMetrics(metrics);
        });
      } else {
        setTimeout(() => reportMetrics(metrics), 0);
      }

      // 收集详细的 Navigation Timing
      const timingMetrics = collectNavigationTiming();
      if (timingMetrics) {
        logger.debug('[Navigation Timing]', {
          path: currentPath,
          ...timingMetrics,
        });
      }

      // 重置计时器
      startTimeRef.current = performance.now();
      prevPathRef.current = currentPath;
    }
  }, [pathname, searchParams, enabled, reportMetrics, collectNavigationTiming]);
}

/**
 * 收集完整的页面加载指标
 */
export function collectPageLoadMetrics(): {
  webVitals: Record<string, number>;
  navigation: NavigationTimingMetrics | null;
  resources: Array<{ name: string; duration: number; size: number }>;
} {
  if (typeof window === 'undefined') {
    return { webVitals: {}, navigation: null, resources: [] };
  }

  // Navigation Timing
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const navigationMetrics = navigation
    ? {
        dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcpTime: navigation.connectEnd - navigation.connectStart,
        ttfb: navigation.responseStart - navigation.startTime,
        domParseTime:
          navigation.domComplete -
          ((navigation as unknown as { domLoading?: number }).domLoading || navigation.domComplete),
        loadTime: navigation.loadEventEnd - navigation.startTime,
        renderTime: navigation.domComplete - navigation.responseEnd,
      }
    : null;

  // 资源加载时间
  const resources = performance
    .getEntriesByType('resource')
    .slice(0, 10) // 只取前10个
    .map((r) => ({
      name: r.name.split('/').pop() || r.name,
      duration: Math.round(r.duration),
      size: (r as PerformanceResourceTiming).transferSize,
    }));

  return {
    webVitals: {},
    navigation: navigationMetrics,
    resources,
  };
}

/**
 * 监控长任务
 */
export function useLongTaskMonitor(threshold: number = 50, enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > threshold) {
            logger.warn('Long task detected during route transition', {
              duration: entry.duration,
              startTime: entry.startTime,
              threshold,
            });
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });

      return () => observer.disconnect();
    } catch (error) {
      logger.debug('Long task monitoring not supported', { error });
    }
    return undefined;
  }, [threshold, enabled]);
}

/**
 * 路由性能分析器 Hook
 */
export function useRouteProfiler(): {
  startProfiling: () => void;
  endProfiling: () => void;
  getReport: () => RouteMetrics[];
} {
  const metricsRef = useRef<RouteMetrics[]>([]);
  const isProfilingRef = useRef(false);
  const startTimeRef = useRef(0);

  const startProfiling = useCallback(() => {
    isProfilingRef.current = true;
    startTimeRef.current = performance.now();
    metricsRef.current = [];
    logger.info('Route profiling started');
  }, []);

  const endProfiling = useCallback(() => {
    isProfilingRef.current = false;
    const duration = performance.now() - startTimeRef.current;
    logger.info('Route profiling ended', {
      duration: `${duration.toFixed(2)}ms`,
      routes: metricsRef.current.length,
    });
  }, []);

  const getReport = useCallback(() => {
    return metricsRef.current;
  }, []);

  useEffect(() => {
    if (!isProfilingRef.current) return;

    // 监听路由变化并记录
    const handleRouteChange = () => {
      if (!isProfilingRef.current) return;

      const duration = performance.now() - startTimeRef.current;
      metricsRef.current.push({
        path: window.location.pathname,
        duration,
        timestamp: Date.now(),
        navigationType: 'navigate',
      });
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  return { startProfiling, endProfiling, getReport };
}

const routePerformanceExports = {
  useRoutePerformance,
  useLongTaskMonitor,
  useRouteProfiler,
  collectPageLoadMetrics,
};

export default routePerformanceExports;
