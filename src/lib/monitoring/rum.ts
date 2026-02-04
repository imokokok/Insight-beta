/**
 * Real User Monitoring (RUM)
 *
 * 真实用户性能监控
 * 收集 Web Vitals、资源加载时间、用户行为等数据
 */

import { onCLS, onFCP, onFID, onLCP, onTTFB, onINP } from 'web-vitals';
import { logger } from '@/lib/logger';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  delta?: number;
  entries: PerformanceEntry[];
  navigationType?: string;
}

interface ResourceTiming {
  name: string;
  duration: number;
  startTime: number;
  initiatorType: string;
  transferSize: number;
}

interface UserBehavior {
  type: 'click' | 'scroll' | 'input' | 'navigation';
  target?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface RUMConfig {
  endpoint?: string;
  sampleRate: number;
  enabled: boolean;
  debug: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: RUMConfig = {
  endpoint: process.env.NEXT_PUBLIC_RUM_ENDPOINT,
  sampleRate: 0.1, // 10% sampling
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
};

// ============================================================================
// Web Vitals Monitoring
// ============================================================================

class WebVitalsMonitor {
  private metrics: Map<string, WebVitalsMetric> = new Map();

  constructor() {
    this.init();
  }

  private init() {
    // Core Web Vitals
    onCLS((metric) => this.handleMetric('CLS', metric));
    onFCP((metric) => this.handleMetric('FCP', metric));
    onFID((metric) => this.handleMetric('FID', metric));
    onLCP((metric) => this.handleMetric('LCP', metric));
    onINP((metric) => this.handleMetric('INP', metric));

    // Additional metrics
    onTTFB((metric) => this.handleMetric('TTFB', metric));
  }

  private handleMetric(name: string, metric: WebVitalsMetric) {
    this.metrics.set(name, metric);

    if (DEFAULT_CONFIG.debug) {
      logger.debug(`[RUM] ${name}:`, { value: metric.value });
    }

    // Send to analytics
    this.sendMetric(name, metric);
  }

  private sendMetric(name: string, metric: WebVitalsMetric) {
    if (!DEFAULT_CONFIG.enabled) return;

    // Check sampling
    if (Math.random() > DEFAULT_CONFIG.sampleRate) return;

    const payload = {
      type: 'web-vital',
      name,
      value: metric.value,
      id: metric.id,
      delta: metric.delta,
      navigationType: metric.navigationType,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.sendToEndpoint(payload);
  }

  private sendToEndpoint(payload: unknown) {
    if (!DEFAULT_CONFIG.endpoint) {
      // Use sendBeacon for reliability
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/web-vitals', JSON.stringify(payload));
      }
      return;
    }

    fetch(DEFAULT_CONFIG.endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(() => {
      // Silent fail - don't impact user experience
    });
  }

  getMetrics(): Record<string, WebVitalsMetric> {
    return Object.fromEntries(this.metrics);
  }
}

// ============================================================================
// Resource Timing Monitoring
// ============================================================================

class ResourceMonitor {
  private observer: PerformanceObserver | null = null;
  private resources: ResourceTiming[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.init();
    }
  }

  private init() {
    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.handleResource(entry as PerformanceResourceTiming);
          }
        }
      });

      this.observer.observe({ entryTypes: ['resource'] });
    } catch {
      logger.warn('[RUM] Resource monitoring not supported');
    }
  }

  private handleResource(entry: PerformanceResourceTiming) {
    // Only track slow resources (> 1s)
    if (entry.duration < 1000) return;

    const timing: ResourceTiming = {
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
      initiatorType: entry.initiatorType,
      transferSize: entry.transferSize,
    };

    this.resources.push(timing);

    // Keep only last 100 resources
    if (this.resources.length > 100) {
      this.resources.shift();
    }

    if (DEFAULT_CONFIG.debug && entry.duration > 3000) {
      logger.warn(`[RUM] Slow resource: ${entry.name} (${entry.duration.toFixed(0)}ms)`);
    }
  }

  getSlowResources(threshold = 1000): ResourceTiming[] {
    return this.resources.filter((r) => r.duration > threshold);
  }

  disconnect() {
    this.observer?.disconnect();
  }
}

// ============================================================================
// User Behavior Tracking
// ============================================================================

class BehaviorTracker {
  private behaviors: UserBehavior[] = [];
  private maxSize = 50;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Track clicks
    document.addEventListener('click', (e) => {
      this.track({
        type: 'click',
        target: this.getElementSelector(e.target as Element),
        timestamp: Date.now(),
      });
    });

    // Track scroll (throttled)
    let scrollTimeout: ReturnType<typeof setTimeout>;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.track({
          type: 'scroll',
          timestamp: Date.now(),
          metadata: {
            scrollY: window.scrollY,
            scrollX: window.scrollX,
          },
        });
      }, 1000);
    });

    // Track navigation
    window.addEventListener('beforeunload', () => {
      this.track({
        type: 'navigation',
        timestamp: Date.now(),
        metadata: {
          url: window.location.href,
          timeOnPage: Date.now() - performance.timing.navigationStart,
        },
      });
    });
  }

  private track(behavior: UserBehavior) {
    this.behaviors.push(behavior);

    if (this.behaviors.length > this.maxSize) {
      this.behaviors.shift();
    }
  }

  private getElementSelector(element: Element): string {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = Array.from(element.classList)
      .slice(0, 2)
      .map((c) => `.${c}`)
      .join('');

    return `${tag}${id}${classes}`;
  }

  getBehaviors(): UserBehavior[] {
    return [...this.behaviors];
  }
}

// ============================================================================
// Error Tracking
// ============================================================================

class ErrorTracker {
  private errors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
    url: string;
  }> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    window.addEventListener('error', (e) => {
      this.track({
        message: e.message,
        stack: e.error?.stack,
        timestamp: Date.now(),
        url: window.location.href,
      });
    });

    window.addEventListener('unhandledrejection', (e) => {
      this.track({
        message: String(e.reason),
        stack: e.reason?.stack,
        timestamp: Date.now(),
        url: window.location.href,
      });
    });
  }

  private track(error: { message: string; stack?: string; timestamp: number; url: string }) {
    this.errors.push(error);

    if (DEFAULT_CONFIG.debug) {
      console.error('[RUM] Error tracked:', error.message);
    }

    // Send to endpoint
    if (DEFAULT_CONFIG.enabled && Math.random() <= DEFAULT_CONFIG.sampleRate) {
      fetch('/api/analytics/errors', {
        method: 'POST',
        body: JSON.stringify(error),
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(() => {});
    }
  }

  getErrors() {
    return [...this.errors];
  }
}

// ============================================================================
// Main RUM Manager
// ============================================================================

class RUMManager {
  private webVitals: WebVitalsMonitor;
  private resources: ResourceMonitor;
  private behavior: BehaviorTracker;
  private errors: ErrorTracker;
  private initialized = false;

  constructor() {
    this.webVitals = new WebVitalsMonitor();
    this.resources = new ResourceMonitor();
    this.behavior = new BehaviorTracker();
    this.errors = new ErrorTracker();
  }

  init() {
    if (this.initialized) return;
    if (typeof window === 'undefined') return;

    this.initialized = true;

    if (DEFAULT_CONFIG.debug) {
      logger.debug('[RUM] Initialized');
    }

    // Expose for debugging
    if (DEFAULT_CONFIG.debug) {
      (window as Window & { __RUM__?: RUMManager }).__RUM__ = this;
    }
  }

  getMetrics() {
    return {
      webVitals: this.webVitals.getMetrics(),
      slowResources: this.resources.getSlowResources(),
      behaviors: this.behavior.getBehaviors(),
      errors: this.errors.getErrors(),
    };
  }

  // Manual performance mark
  mark(name: string) {
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    }
  }

  // Manual performance measure
  measure(name: string, startMark: string, endMark?: string) {
    if (typeof performance !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark);
      } catch (e) {
        logger.warn(`[RUM] Failed to measure ${name}:`, { error: e });
      }
    }
  }

  // Track custom event
  track(event: string, data?: Record<string, unknown>) {
    if (!DEFAULT_CONFIG.enabled) return;

    const payload = {
      type: 'custom',
      event,
      data,
      timestamp: Date.now(),
      url: window.location.href,
    };

    fetch('/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify(payload),
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(() => {});
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const rum = new RUMManager();

// ============================================================================
// React Hook
// ============================================================================

import { useEffect, useCallback } from 'react';

export function useRUM() {
  useEffect(() => {
    rum.init();
  }, []);

  const track = useCallback((event: string, data?: Record<string, unknown>) => {
    rum.track(event, data);
  }, []);

  const mark = useCallback((name: string) => {
    rum.mark(name);
  }, []);

  const measure = useCallback((name: string, startMark: string, endMark?: string) => {
    rum.measure(name, startMark, endMark);
  }, []);

  return {
    track,
    mark,
    measure,
    getMetrics: () => rum.getMetrics(),
  };
}

// ============================================================================
// Next.js Integration
// ============================================================================

export function initRUM() {
  if (typeof window !== 'undefined') {
    rum.init();
  }
}
