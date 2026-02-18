import type { NextWebVitalsMetric } from 'next/app';

import { logger } from '@/shared/logger';

const WEB_VITALS = ['LCP', 'FID', 'CLS', 'TTFB', 'INP'];

function sendToAnalytics(metric: NextWebVitalsMetric): void {
  const body = {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    page: typeof window !== 'undefined' ? window.location.pathname : '',
    timestamp: Date.now(),
  };

  if (process.env.NODE_ENV === 'development') {
    logger.info('Web Vital', body);
    return;
  }

  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics/web-vitals', blob);
  } else {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch((err) => {
      logger.error('Failed to send web vitals', { error: err });
    });
  }
}

export function reportWebVitals(metric: NextWebVitalsMetric): void {
  if (WEB_VITALS.includes(metric.name)) {
    sendToAnalytics(metric);
  }
}
