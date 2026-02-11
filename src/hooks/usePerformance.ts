/**
 * 性能监控 Hook
 * 用于在组件中监控性能和懒加载
 */

import { useEffect } from 'react';

import { logger } from '@/lib/logger';
import { initWebVitalsMonitoring } from '@/lib/performance/monitor';

/**
 * 初始化 Web Vitals 监控
 */
export function useWebVitals() {
  useEffect(() => {
    initWebVitalsMonitoring();
  }, []);
}

/**
 * 长任务监控 Hook
 */
const LONG_TASK_THRESHOLD_MS = 50;

export function useLongTaskMonitor(callback?: (duration: number) => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const duration = (entry as PerformanceEntry & { duration?: number }).duration;
          if (duration && duration > LONG_TASK_THRESHOLD_MS) {
            // 超过阈值认为是长任务
            logger.warn('[Performance] Long task detected', { duration: duration.toFixed(2) });
            callback?.(duration);
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] });

      return () => observer.disconnect();
    } catch (e) {
      // 浏览器不支持 longtask
      return;
    }
  }, [callback]);
}
