import * as Sentry from '@sentry/nextjs';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

interface RegisterOptions {
  serviceName?: string;
}

async function initOpenTelemetryCore() {
  try {
    const otel = await import(
      process.env.NEXT_RUNTIME === 'nodejs'
        ? './lib/monitoring/opentelemetry'
        : './lib/monitoring/opentelemetry.client'
    );
    if (typeof otel.default === 'function') {
      otel.default();
    }
  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry', { error });
  }
}

async function initWorker() {
  const disabled = ['1', 'true'].includes(env.INSIGHT_DISABLE_EMBEDDED_WORKER.toLowerCase());
  if (!disabled && process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      await import('./server/worker' /* webpackExclude: /worker/ */);
    } catch (error) {
      logger.error('Failed to initialize worker', { error });
    }
  }
}

export async function register(options: RegisterOptions = {}) {
  const serviceName = options.serviceName || 'insight-beta';

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const startTime = Date.now();

    await Promise.allSettled([initOpenTelemetryCore(), initWorker()]);

    const initDuration = Date.now() - startTime;
    if (initDuration > 1000) {
      logger.warn('Slow initialization detected', {
        service: serviceName,
        duration: `${initDuration}ms`,
      });
    }
  }
}

export function onError(error: Error | unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error('Application error detected', {
    message: errorMessage,
    stack: errorStack,
    service: 'insight-beta',
  });

  Sentry.captureException(error);
}
