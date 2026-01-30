import { logger } from '@/lib/logger';

// Performance metrics collection
interface PerformanceMetrics {
  webVitals: {
    lcp: number | null;
    fid: number | null;
    cls: number | null;
    fcp: number | null;
    ttfb: number | null;
  };
  custom: Map<string, number>;
  apiLatency: Map<string, { count: number; avg: number; max: number; min: number }>;
  resourceTiming: PerformanceResourceTiming[];
}

const metrics: PerformanceMetrics = {
  webVitals: {
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
  },
  custom: new Map(),
  apiLatency: new Map(),
  resourceTiming: [],
};

// Web Vitals monitoring
export function initWebVitalsMonitoring() {
  if (typeof window === 'undefined') return;

  // Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          metrics.webVitals.lcp = lastEntry.startTime;
          reportMetric('LCP', lastEntry.startTime);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch {
      // LCP not supported
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'first-input') {
            const fid = (entry as PerformanceEventTiming).processingStart - entry.startTime;
            metrics.webVitals.fid = fid;
            reportMetric('FID', fid);
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch {
      // FID not supported
    }

    // Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const layoutShiftEntry = entry as { hadRecentInput?: boolean; value?: number };
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value ?? 0;
          }
        });
        metrics.webVitals.cls = clsValue;
        reportMetric('CLS', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch {
      // CLS not supported
    }

    // First Contentful Paint
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            metrics.webVitals.fcp = entry.startTime;
            reportMetric('FCP', entry.startTime);
          }
        });
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch {
      // FCP not supported
    }
  }

  // Time to First Byte
  if (performance.timing) {
    const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
    metrics.webVitals.ttfb = ttfb;
    reportMetric('TTFB', ttfb);
  }
}

// Custom performance marking
export function markPerformance(name: string, value?: number) {
  const timestamp = value ?? performance.now();
  metrics.custom.set(name, timestamp);

  if (process.env.NODE_ENV === 'development') {
    performance.mark(name);
  }

  return timestamp;
}

export function measurePerformance(name: string, startMark: string, endMark?: string) {
  if (process.env.NODE_ENV === 'development') {
    try {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name);
      const firstEntry = entries[0];
      if (firstEntry) {
        const duration = firstEntry.duration;
        metrics.custom.set(name, duration);
        return duration;
      }
    } catch {
      // Measurement failed
    }
  }
  return null;
}

// API latency tracking
export function trackApiLatency(endpoint: string, duration: number) {
  const existing = metrics.apiLatency.get(endpoint);

  if (existing) {
    existing.count++;
    existing.avg = (existing.avg * (existing.count - 1) + duration) / existing.count;
    existing.max = Math.max(existing.max, duration);
    existing.min = Math.min(existing.min, duration);
  } else {
    metrics.apiLatency.set(endpoint, {
      count: 1,
      avg: duration,
      max: duration,
      min: duration,
    });
  }

  // Log slow API calls
  if (duration > 1000) {
    logger.warn('Slow API call detected', { endpoint, duration });
  }
}

// Resource timing collection
export function collectResourceTiming() {
  if (typeof window === 'undefined') return;

  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  metrics.resourceTiming = entries.slice(-50); // Keep last 50

  // Analyze slow resources
  entries.forEach((entry) => {
    if (entry.duration > 1000) {
      logger.warn('Slow resource detected', {
        name: entry.name,
        duration: entry.duration,
        initiatorType: entry.initiatorType,
      });
    }
  });
}

// Memory monitoring
export function monitorMemory() {
  if (typeof window === 'undefined') return null;

  interface MemoryInfo {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  }
  const memory = (performance as { memory?: MemoryInfo }).memory;
  if (memory) {
    const used = memory.usedJSHeapSize;
    const total = memory.totalJSHeapSize;
    const limit = memory.jsHeapSizeLimit;

    // Alert if memory usage is high
    if (used / limit > 0.8) {
      logger.warn('High memory usage detected', {
        used: `${(used / 1024 / 1024).toFixed(2)}MB`,
        total: `${(total / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(limit / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    return { used, total, limit };
  }

  return null;
}

// Long task monitoring
export function initLongTaskMonitoring() {
  if (typeof window === 'undefined') return;
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const duration = entry.duration;
        if (duration > 50) {
          logger.warn('Long task detected', {
            duration,
            startTime: entry.startTime,
          });
        }
      });
    });
    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    // Long task API not supported
  }
}

// Error tracking
interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  timestamp: number;
  userAgent: string;
}

const errorReports: ErrorReport[] = [];
const MAX_ERROR_REPORTS = 50;

export function trackError(error: Error, context?: Record<string, unknown>) {
  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    url: typeof window !== 'undefined' ? window.location.href : '',
    timestamp: Date.now(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  errorReports.unshift(report);
  if (errorReports.length > MAX_ERROR_REPORTS) {
    errorReports.pop();
  }

  logger.error('Client error tracked', { ...report, context });
}

// Performance report generation
export function generatePerformanceReport() {
  return {
    webVitals: metrics.webVitals,
    custom: Object.fromEntries(metrics.custom),
    apiLatency: Object.fromEntries(
      Array.from(metrics.apiLatency.entries()).map(([key, value]) => [
        key,
        { ...value, avg: Math.round(value.avg) },
      ]),
    ),
    memory: monitorMemory(),
    errorCount: errorReports.length,
    timestamp: new Date().toISOString(),
  };
}

// Real User Monitoring (RUM)
export function initRUM() {
  if (typeof window === 'undefined') return;

  initWebVitalsMonitoring();
  initLongTaskMonitoring();

  // Track page load performance
  window.addEventListener('load', () => {
    setTimeout(() => {
      collectResourceTiming();

      // Send initial performance report
      const initialReport = generatePerformanceReport();
      logger.info('Initial performance report', initialReport);
    }, 0);
  });

  // Track errors
  window.addEventListener('error', (event) => {
    trackError(event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    trackError(error);
  });

  // Periodic memory monitoring
  setInterval(() => {
    monitorMemory();
  }, 30000);

  // Periodic report generation
  setInterval(() => {
    const report = generatePerformanceReport();
    // Send to analytics in production
    if (process.env.NODE_ENV === 'production' && report) {
      import('./analyticsReporter').then(({ reportWebVital }) => {
        reportWebVital('performance_report', 1, 'good');
      });
    }
  }, 60000);
}

// Metric reporting helper
function reportMetric(name: string, value: number) {
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${name}:`, value);
  }

  // Send to analytics in production
  if (process.env.NODE_ENV === 'production') {
    import('./analyticsReporter').then(({ reportWebVital }) => {
      const rating = value < 1000 ? 'good' : value < 3000 ? 'needs-improvement' : 'poor';
      reportWebVital(name, value, rating);
    });
  }
}

// Performance budget checking
interface PerformanceBudget {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

const DEFAULT_BUDGET: PerformanceBudget = {
  lcp: 2500,
  fid: 100,
  cls: 0.1,
  fcp: 1800,
  ttfb: 600,
};

export function checkPerformanceBudget(budget: Partial<PerformanceBudget> = {}) {
  const fullBudget = { ...DEFAULT_BUDGET, ...budget };
  const violations: string[] = [];

  if (metrics.webVitals.lcp && metrics.webVitals.lcp > fullBudget.lcp) {
    violations.push(`LCP: ${metrics.webVitals.lcp}ms (budget: ${fullBudget.lcp}ms)`);
  }
  if (metrics.webVitals.fid && metrics.webVitals.fid > fullBudget.fid) {
    violations.push(`FID: ${metrics.webVitals.fid}ms (budget: ${fullBudget.fid}ms)`);
  }
  if (metrics.webVitals.cls && metrics.webVitals.cls > fullBudget.cls) {
    violations.push(`CLS: ${metrics.webVitals.cls} (budget: ${fullBudget.cls})`);
  }
  if (metrics.webVitals.fcp && metrics.webVitals.fcp > fullBudget.fcp) {
    violations.push(`FCP: ${metrics.webVitals.fcp}ms (budget: ${fullBudget.fcp}ms)`);
  }
  if (metrics.webVitals.ttfb && metrics.webVitals.ttfb > fullBudget.ttfb) {
    violations.push(`TTFB: ${metrics.webVitals.ttfb}ms (budget: ${fullBudget.ttfb}ms)`);
  }

  if (violations.length > 0) {
    logger.warn('Performance budget violations', { violations });
  }

  return violations;
}

// Export metrics for external use
export function getMetrics() {
  return { ...metrics };
}

export function getErrorReports() {
  return [...errorReports];
}

export function clearMetrics() {
  metrics.custom.clear();
  metrics.apiLatency.clear();
  metrics.resourceTiming = [];
  errorReports.length = 0;
}
