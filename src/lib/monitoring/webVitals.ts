import { logger } from '@/lib/logger';

type WebVitalsMetric = {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
  navigationType: string;
};

type WebVitalsReport = {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  inp?: number;
  timestamp: string;
  url: string;
  userAgent: string;
};

class WebVitalsCollector {
  private metrics: Partial<WebVitalsReport> = {};
  private reported = false;

  private report() {
    if (this.reported) return;
    this.reported = true;

    const report: WebVitalsReport = {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals]', report);
    }

    // Send to analytics endpoint
    this.sendToAnalytics(report);
  }

  private async sendToAnalytics(report: WebVitalsReport) {
    try {
      // Use sendBeacon if available for reliability
      const data = JSON.stringify(report);
      const endpoint = '/api/analytics/web-vitals';

      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, data);
      } else {
        await fetch(endpoint, {
          method: 'POST',
          body: data,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        });
      }
    } catch (error) {
      logger.error('Failed to send Web Vitals', { error });
    }
  }

  onMetric(metric: WebVitalsMetric) {
    const { name, value, rating } = metric;

    switch (name) {
      case 'LCP':
        this.metrics.lcp = value;
        break;
      case 'FID':
        this.metrics.fid = value;
        break;
      case 'CLS':
        this.metrics.cls = value;
        break;
      case 'FCP':
        this.metrics.fcp = value;
        break;
      case 'TTFB':
        this.metrics.ttfb = value;
        break;
      case 'INP':
        this.metrics.inp = value;
        break;
    }

    // Log poor metrics immediately
    if (rating === 'poor') {
      logger.warn(`Poor Web Vital: ${name} = ${value}`, {
        metric: name,
        value,
        rating,
        url: typeof window !== 'undefined' ? window.location.href : '',
      });
    }

    // Report when we have key metrics
    if (this.metrics.lcp && this.metrics.cls) {
      this.report();
    }
  }
}

const collector = new WebVitalsCollector();

export function reportWebVitals(metric: WebVitalsMetric) {
  collector.onMetric(metric);
}

// Manual measurement functions for custom tracking
export function measureLCP(): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(0);
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        const value = lastEntry.startTime;
        resolve(value);
        observer.disconnect();
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });

    // Timeout after 10 seconds
    setTimeout(() => {
      observer.disconnect();
      resolve(0);
    }, 10000);
  });
}

export function measureCLS(): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(0);
      return;
    }

    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as LayoutShift).hadRecentInput) {
          clsValue += (entry as LayoutShift).value;
        }
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });

    // Report CLS on page hide
    const reportCLS = () => {
      observer.disconnect();
      resolve(clsValue);
    };

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        reportCLS();
      }
    });

    // Timeout after 30 seconds
    setTimeout(reportCLS, 30000);
  });
}

export function measureFID(): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(0);
      return;
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fid = (entry as PerformanceEventTiming).processingStart - entry.startTime;
        resolve(fid);
        observer.disconnect();
        return;
      }
    });

    observer.observe({ entryTypes: ['first-input'] });

    // Timeout after 5 seconds
    setTimeout(() => {
      observer.disconnect();
      resolve(0);
    }, 5000);
  });
}

export function measureFCP(): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(0);
      return;
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          resolve(entry.startTime);
          observer.disconnect();
          return;
        }
      }
    });

    observer.observe({ entryTypes: ['paint'] });

    // Timeout after 5 seconds
    setTimeout(() => {
      observer.disconnect();
      resolve(0);
    }, 5000);
  });
}

export function measureTTFB(): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(0);
      return;
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      resolve(navigation.responseStart - navigation.startTime);
    } else {
      resolve(0);
    }
  });
}

// Type definitions for LayoutShift
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

// Utility to get all metrics at once
export async function getAllWebVitals(): Promise<Partial<WebVitalsReport>> {
  const [lcp, cls, fid, fcp, ttfb] = await Promise.all([
    measureLCP(),
    measureCLS(),
    measureFID(),
    measureFCP(),
    measureTTFB(),
  ]);

  return {
    lcp,
    cls,
    fid,
    fcp,
    ttfb,
    timestamp: new Date().toISOString(),
  };
}

// Hook for React components
export function useWebVitals() {
  return {
    getAllWebVitals,
    measureLCP,
    measureCLS,
    measureFID,
    measureFCP,
    measureTTFB,
  };
}
