/**
 * PerformanceMonitor Component
 *
 * 性能监控组件，用于收集和报告 Web Vitals 指标
 */

'use client';

import { useEffect, useCallback } from 'react';

import { logger } from '@/lib/logger';

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

interface PerformanceMonitorProps {
  onMetric?: (metric: WebVitalsMetric) => void;
  reportToApi?: boolean;
  apiEndpoint?: string;
}

// Web Vitals 阈值定义
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

/**
 * 获取指标评级
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * 报告性能指标到 API
 */
async function reportToAnalytics(metric: WebVitalsMetric, endpoint: string): Promise<void> {
  if (typeof navigator === 'undefined') return;

  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
  });

  // 使用 sendBeacon 或 fetch
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, body);
  } else {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    } catch (error) {
      logger.error('Failed to report web vitals', { error });
    }
  }
}

/**
 * 收集 CLS (Cumulative Layout Shift)
 */
function collectCLS(callback: (metric: WebVitalsMetric) => void): void {
  if (typeof window === 'undefined') return;

  let clsValue = 0;
  const clsEntries: PerformanceEntry[] = [];

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // 只计算没有最近用户输入的布局偏移
      const layoutShiftEntry = entry as PerformanceEntry & {
        hadRecentInput?: boolean;
        value?: number;
      };
      if (!layoutShiftEntry.hadRecentInput) {
        clsEntries.push(entry);
        clsValue += layoutShiftEntry.value || 0;
      }
    }
  });

  observer.observe({ entryTypes: ['layout-shift'] });

  // 页面隐藏时报告
  const reportCLS = () => {
    const metric: WebVitalsMetric = {
      name: 'CLS',
      value: clsValue,
      rating: getRating('CLS', clsValue),
      delta: clsValue,
      id: Math.random().toString(36).slice(2),
      navigationType: 'navigate',
    };
    callback(metric);
    observer.disconnect();
  };

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      reportCLS();
    }
  });

  // 页面卸载时也报告
  window.addEventListener('pagehide', reportCLS);
}

/**
 * 收集 FCP (First Contentful Paint)
 */
function collectFCP(callback: (metric: WebVitalsMetric) => void): void {
  if (typeof window === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const fcpEntry = entries[entries.length - 1];

    if (fcpEntry) {
      const metric: WebVitalsMetric = {
        name: 'FCP',
        value: fcpEntry.startTime,
        rating: getRating('FCP', fcpEntry.startTime),
        delta: fcpEntry.startTime,
        id: fcpEntry.entryType + '-' + fcpEntry.startTime,
        navigationType: 'navigate',
      };
      callback(metric);
    }
  });

  observer.observe({ entryTypes: ['paint'] });
}

/**
 * 收集 LCP (Largest Contentful Paint)
 */
function collectLCP(callback: (metric: WebVitalsMetric) => void): void {
  if (typeof window === 'undefined') return;

  let lcpValue = 0;
  let lcpEntry: PerformanceEntry | null = null;

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];

    if (lastEntry) {
      const entryStartTime = (lastEntry as PerformanceEntry & { startTime: number }).startTime;
      if (entryStartTime > lcpValue) {
        lcpValue = entryStartTime;
        lcpEntry = lastEntry;
      }
    }
  });

  observer.observe({ entryTypes: ['largest-contentful-paint'] });

  // 页面隐藏时报告最终的 LCP
  const reportLCP = () => {
    if (lcpEntry) {
      const metric: WebVitalsMetric = {
        name: 'LCP',
        value: lcpValue,
        rating: getRating('LCP', lcpValue),
        delta: lcpValue,
        id: lcpEntry.entryType + '-' + lcpValue,
        navigationType: 'navigate',
      };
      callback(metric);
      observer.disconnect();
    }
  };

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      reportLCP();
    }
  });
}

/**
 * 收集 FID (First Input Delay)
 */
function collectFID(callback: (metric: WebVitalsMetric) => void): void {
  if (typeof window === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const firstInputEntry = entry as PerformanceEntry & { processingStart: number };
      const delay = firstInputEntry.processingStart - entry.startTime;

      const metric: WebVitalsMetric = {
        name: 'FID',
        value: delay,
        rating: getRating('FID', delay),
        delta: delay,
        id: entry.entryType + '-' + entry.startTime,
        navigationType: 'navigate',
      };
      callback(metric);
    }
  });

  observer.observe({ entryTypes: ['first-input'] });
}

/**
 * 收集 TTFB (Time to First Byte)
 */
function collectTTFB(callback: (metric: WebVitalsMetric) => void): void {
  if (typeof window === 'undefined') return;

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  if (navigation) {
    const ttfb = navigation.responseStart - navigation.startTime;

    const metric: WebVitalsMetric = {
      name: 'TTFB',
      value: ttfb,
      rating: getRating('TTFB', ttfb),
      delta: ttfb,
      id: 'navigation-' + navigation.startTime,
      navigationType: 'navigate',
    };
    callback(metric);
  }
}

/**
 * 收集 INP (Interaction to Next Paint)
 */
function collectINP(callback: (metric: WebVitalsMetric) => void): void {
  if (typeof window === 'undefined') return;

  let maxDuration = 0;
  let maxEntry: PerformanceEntry | null = null;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const eventEntry = entry as PerformanceEntry & { duration: number };
      if (eventEntry.duration > maxDuration) {
        maxDuration = eventEntry.duration;
        maxEntry = entry;
      }
    }
  });

  observer.observe({ entryTypes: ['event'] });

  // 页面隐藏时报告
  const reportINP = () => {
    if (maxEntry) {
      const metric: WebVitalsMetric = {
        name: 'INP',
        value: maxDuration,
        rating: getRating('INP', maxDuration),
        delta: maxDuration,
        id: maxEntry.entryType + '-' + maxEntry.startTime,
        navigationType: 'navigate',
      };
      callback(metric);
      observer.disconnect();
    }
  };

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      reportINP();
    }
  });
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  onMetric,
  reportToApi = false,
  apiEndpoint = '/api/analytics/web-vitals',
}) => {
  const handleMetric = useCallback(
    (metric: WebVitalsMetric) => {
      // 记录到控制台
      logger.debug(`[Web Vitals] ${metric.name}:`, {
        value: metric.value,
        rating: metric.rating,
      });

      // 发送到 Google Analytics (如果可用)
      const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
      if (typeof window !== 'undefined' && gtag) {
        gtag('event', metric.name, {
          value: Math.round(metric.value),
          metric_rating: metric.rating,
          metric_id: metric.id,
        });
      }

      // 自定义回调
      onMetric?.(metric);

      // 报告到 API
      if (reportToApi) {
        reportToAnalytics(metric, apiEndpoint);
      }
    },
    [onMetric, reportToApi, apiEndpoint],
  );

  useEffect(() => {
    // 收集所有 Web Vitals 指标
    collectCLS(handleMetric);
    collectFCP(handleMetric);
    collectLCP(handleMetric);
    collectFID(handleMetric);
    collectTTFB(handleMetric);
    collectINP(handleMetric);

    // 收集资源加载时间
    const collectResourceTiming = () => {
      if (typeof performance === 'undefined') return;

      const resources = performance.getEntriesByType('resource');
      const slowResources = resources.filter(
        (r) => (r as PerformanceResourceTiming).duration > 1000,
      );

      if (slowResources.length > 0) {
        const slowResourceInfo = slowResources.map((r) => ({
          name: r.name,
          duration: Math.round((r as PerformanceResourceTiming).duration),
        }));
        logger.warn('[Performance] Slow resources detected:', {
          resources: slowResourceInfo,
        });
      }
    };

    // 延迟收集资源时间
    const timeoutId = setTimeout(collectResourceTiming, 5000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [handleMetric]);

  // 这个组件不渲染任何内容
  return null;
};

export default PerformanceMonitor;
