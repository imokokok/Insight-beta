'use client';

import { useEffect } from 'react';
import { reportWebVitals } from '@/lib/monitoring/webVitals';

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
  }, []);

  return null;
}
