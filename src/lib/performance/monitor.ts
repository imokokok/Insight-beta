/**
 * 性能监控工具
 * 用于监控 Web Vitals 和自定义性能指标
 */

import { logger } from '@/lib/logger';

// Web Vitals 指标类型
export interface WebVitalsMetric {
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id: string;
  navigationType?: string;
}


// 指标阈值配置
const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * 获取指标评级
 */
function getRating(name: string, value: number): WebVitalsMetric['rating'] {
  const threshold = THRESHOLDS[name];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 报告 Web Vitals 指标
 */
export function reportWebVitals(metric: WebVitalsMetric): void {
  // 发送到分析服务
  if (typeof window !== 'undefined' && 'gtag' in window) {
    // @ts-expect-error - gtag is defined by Google Analytics
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // 记录性能问题到日志
  if (typeof window !== 'undefined' && metric.rating === 'poor') {
    logger.warn(`Poor Web Vital: ${metric.name}`, { value: metric.value });
  }
}

/**
 * 观察 LCP (Largest Contentful Paint)
 */
export function observeLCP(callback: (metric: WebVitalsMetric) => void): void {
  if (typeof window === 'undefined') return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };

      const value = lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime;

      callback({
        name: 'LCP',
        value,
        rating: getRating('LCP', value),
        id: generateId(),
      });
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch {
    logger.warn('LCP observation not supported');
  }
}

/**
 * 观察 FID (First Input Delay)
 */
export function observeFID(callback: (metric: WebVitalsMetric) => void): void {
  if (typeof window === 'undefined') return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      entries.forEach((entry) => {
        const firstEntry = entry as PerformanceEntry & { processingStart: number; startTime: number };
        const value = firstEntry.processingStart - firstEntry.startTime;

        callback({
          name: 'FID',
          value,
          rating: getRating('FID', value),
          id: generateId(),
        });
      });
    });

    observer.observe({ entryTypes: ['first-input'] });
  } catch {
    logger.warn('FID observation not supported');
  }
}

/**
 * 观察 CLS (Cumulative Layout Shift)
 */
export function observeCLS(callback: (metric: WebVitalsMetric) => void): void {
  if (typeof window === 'undefined') return;

  let clsValue = 0;
  let clsEntries: PerformanceEntry[] = [];

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEntry[];

      entries.forEach((entry) => {
        // 只计算没有最近用户输入的 CLS
        const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!layoutShiftEntry.hadRecentInput) {
          clsEntries.push(entry);
          clsValue += layoutShiftEntry.value ?? 0;
        }
      });

      callback({
        name: 'CLS',
        value: clsValue,
        rating: getRating('CLS', clsValue),
        id: generateId(),
      });
    });

    observer.observe({ entryTypes: ['layout-shift'] });
  } catch {
    logger.warn('CLS observation not supported');
  }
}

/**
 * 观察 FCP (First Contentful Paint)
 */
export function observeFCP(callback: (metric: WebVitalsMetric) => void): void {
  if (typeof window === 'undefined') return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstEntry = entries[0];

      if (firstEntry) {
        const value = firstEntry.startTime;

        callback({
          name: 'FCP',
          value,
          rating: getRating('FCP', value),
          id: generateId(),
        });
      }
    });

    observer.observe({ entryTypes: ['paint'] });
  } catch {
    logger.warn('FCP observation not supported');
  }
}

/**
 * 观察 TTFB (Time to First Byte)
 */
export function observeTTFB(callback: (metric: WebVitalsMetric) => void): void {
  if (typeof window === 'undefined') return;

  try {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (navigation) {
      const value = navigation.responseStart - navigation.startTime;

      callback({
        name: 'TTFB',
        value,
        rating: getRating('TTFB', value),
        id: generateId(),
      });
    }
  } catch {
    logger.warn('TTFB observation not supported');
  }
}




/**
 * 初始化所有 Web Vitals 监控
 */
export function initWebVitalsMonitoring(): void {
  if (typeof window === 'undefined') return;

  observeLCP(reportWebVitals);
  observeFID(reportWebVitals);
  observeCLS(reportWebVitals);
  observeFCP(reportWebVitals);
  observeTTFB(reportWebVitals);

  logger.info('Web Vitals monitoring initialized');
}
