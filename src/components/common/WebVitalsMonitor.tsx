'use client';

import { useEffect } from 'react';

import * as Sentry from '@sentry/nextjs';

import { logger } from '@/lib/logger';

export function WebVitalsMonitor() {
  useEffect(() => {
    // Dynamically import web-vitals to avoid SSR issues
    import('web-vitals').then(({ onLCP, onFID, onCLS, onFCP, onTTFB, onINP }) => {
      // Register all Web Vitals metrics and send to Sentry
      const reportMetric = (metric: {
        id: string;
        name: string;
        value: number;
        rating: 'good' | 'needs-improvement' | 'poor';
        delta: number;
        entries: PerformanceEntry[];
        navigationType: string;
      }) => {
        // Report to Sentry
        Sentry.addBreadcrumb({
          category: 'web-vitals',
          message: `${metric.name}: ${metric.value}`,
          level: metric.rating === 'poor' ? 'warning' : 'info',
          data: {
            id: metric.id,
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            navigationType: metric.navigationType,
          },
        });

        // Log poor metrics
        if (metric.rating === 'poor') {
          logger.warn(`Poor Web Vital: ${metric.name}`, {
            metric: metric.name,
            value: metric.value,
            rating: metric.rating,
          });
        }
      };

      onLCP((metric) =>
        reportMetric({
          id: metric.id,
          name: 'LCP',
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          entries: metric.entries,
          navigationType: metric.navigationType,
        }),
      );

      onFID((metric) =>
        reportMetric({
          id: metric.id,
          name: 'FID',
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          entries: metric.entries,
          navigationType: metric.navigationType,
        }),
      );

      onCLS((metric) =>
        reportMetric({
          id: metric.id,
          name: 'CLS',
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          entries: metric.entries,
          navigationType: metric.navigationType,
        }),
      );

      onFCP((metric) =>
        reportMetric({
          id: metric.id,
          name: 'FCP',
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          entries: metric.entries,
          navigationType: metric.navigationType,
        }),
      );

      onTTFB((metric) =>
        reportMetric({
          id: metric.id,
          name: 'TTFB',
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          entries: metric.entries,
          navigationType: metric.navigationType,
        }),
      );

      onINP((metric) =>
        reportMetric({
          id: metric.id,
          name: 'INP',
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          entries: metric.entries,
          navigationType: metric.navigationType,
        }),
      );
    });

    // Long Tasks monitoring
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              logger.warn('Long task detected', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name,
              });

              Sentry.addBreadcrumb({
                category: 'performance',
                message: 'Long task detected',
                level: 'warning',
                data: {
                  duration: entry.duration,
                  startTime: entry.startTime,
                },
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

    return () => {
      // Cleanup function
    };
  }, []);

  return null;
}
