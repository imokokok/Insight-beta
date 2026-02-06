'use client';

import { useEffect } from 'react';
import { reportWebVitals } from '@/lib/monitoring/webVitals';
import { logger } from '@/lib/logger';

export function WebVitalsMonitor() {
  useEffect(() => {
    // Dynamically import web-vitals to avoid SSR issues
    import('web-vitals').then(({ onLCP, onFID, onCLS, onFCP, onTTFB, onINP }) => {
      // Register all Web Vitals metrics
      onLCP((metric) => {
        reportWebVitals({
          id: metric.id,
          name: 'LCP',
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          entries: metric.entries,
          navigationType: metric.navigationType,
        });
      });

      onFID((metric) => {
        reportWebVitals({
          id: metric.id,
          name: 'FID',
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          entries: metric.entries,
          navigationType: metric.navigationType,
        });
      });

      onCLS((metric) => {
        reportWebVitals({
          id: metric.id,
          name: 'CLS',
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          entries: metric.entries,
          navigationType: metric.navigationType,
        });
      });

      onFCP((metric) => {
        reportWebVitals({
          id: metric.id,
          name: 'FCP',
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          entries: metric.entries,
          navigationType: metric.navigationType,
        });
      });

      onTTFB((metric) => {
        reportWebVitals({
          id: metric.id,
          name: 'TTFB',
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          entries: metric.entries,
          navigationType: metric.navigationType,
        });
      });

      // INP is the new metric replacing FID
      onINP((metric) => {
        reportWebVitals({
          id: metric.id,
          name: 'INP',
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          entries: metric.entries,
          navigationType: metric.navigationType,
        });
      });
    });

    // Long Tasks 监控 - 检测主线程阻塞
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // 超过 50ms 的任务被认为是长任务
            if (entry.duration > 50) {
              logger.warn('Long task detected', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name,
              });

              // 上报长任务数据
              reportWebVitals({
                id: `longtask-${Date.now()}`,
                name: 'LongTask',
                value: entry.duration,
                rating: entry.duration > 100 ? 'poor' : 'needs-improvement',
                delta: entry.duration,
                entries: [entry],
                navigationType: 'navigate',
              });
            }
          }
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });

        return () => {
          longTaskObserver.disconnect();
        };
      } catch (error) {
        logger.debug('Long tasks monitoring not supported', { error });
      }
    }

    // Resource Timing 监控 - 检测慢资源加载
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const resourceEntry = entry as PerformanceResourceTiming;

            // 检测慢资源（超过 1 秒）
            if (resourceEntry.duration > 1000) {
              logger.warn('Slow resource detected', {
                name: resourceEntry.name,
                duration: resourceEntry.duration,
                initiatorType: resourceEntry.initiatorType,
              });
            }

            // 检测大型资源（超过 500KB）
            if (resourceEntry.transferSize > 500 * 1024) {
              logger.warn('Large resource detected', {
                name: resourceEntry.name,
                transferSize: `${(resourceEntry.transferSize / 1024).toFixed(2)}KB`,
                initiatorType: resourceEntry.initiatorType,
              });
            }
          }
        });

        resourceObserver.observe({ entryTypes: ['resource'] });

        return () => {
          resourceObserver.disconnect();
        };
      } catch (error) {
        logger.debug('Resource timing monitoring not supported', { error });
      }
    }

    return () => {
      // 清理函数（如果需要）
    };
  }, []);

  return null;
}
