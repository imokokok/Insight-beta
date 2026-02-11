/**
 * 性能监控工具
 * 用于监控 Web Vitals 和自定义性能指标
 */

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
  // 发送到控制台（开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, metric);
  }

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

  // 发送到 Sentry
  if (typeof window !== 'undefined' && metric.rating === 'poor') {
    // 可以在这里集成 Sentry 性能监控
    console.warn(`[Performance] Poor ${metric.name}: ${metric.value}`);
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
  } catch (e) {
    console.warn('LCP observation not supported');
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
  } catch (e) {
    console.warn('FID observation not supported');
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
  } catch (e) {
    console.warn('CLS observation not supported');
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
  } catch (e) {
    console.warn('FCP observation not supported');
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
  } catch (e) {
    console.warn('TTFB observation not supported');
  }
}

/**
 * 测量自定义性能指标
 */
export function measurePerformance(
  markName: string,
  startMark?: string,
  endMark?: string
): number | null {
  if (typeof window === 'undefined') return null;

  try {
    if (startMark && endMark) {
      performance.mark(startMark);
      performance.mark(endMark);
      performance.measure(markName, startMark, endMark);
    }

    const entries = performance.getEntriesByName(markName, 'measure');
    return entries[entries.length - 1]?.duration || null;
  } catch (e) {
    console.warn('Performance measurement failed:', e);
    return null;
  }
}

/**
 * 标记性能时间点
 */
export function markPerformance(markName: string): void {
  if (typeof window === 'undefined') return;

  try {
    performance.mark(markName);
  } catch (e) {
    console.warn('Performance mark failed:', e);
  }
}

/**
 * 获取资源加载性能
 */
export function getResourcePerformance(url: string): PerformanceResourceTiming | null {
  if (typeof window === 'undefined') return null;

  try {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources.find(r => r.name.includes(url)) || null;
  } catch (e) {
    console.warn('Resource performance retrieval failed:', e);
    return null;
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

  console.log('[Performance] Web Vitals monitoring initialized');
}

/**
 * 测量组件渲染时间
 */
export function useComponentPerformance(componentName: string) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : 0;

  return {
    end: () => {
      const endTime = typeof performance !== 'undefined' ? performance.now() : 0;
      const duration = endTime - startTime;

      if (process.env.NODE_ENV === 'development' && duration > 16) {
        console.warn(`[Performance] ${componentName} render took ${duration.toFixed(2)}ms`);
      }

      return duration;
    },
  };
}
