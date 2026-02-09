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
    if (typeof otel.initOpenTelemetry === 'function') {
      await otel.initOpenTelemetry();
    }
  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry', { error });
  }
}

async function initWorker() {
  const disabled = env.INSIGHT_DISABLE_EMBEDDED_WORKER;
  if (!disabled && process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      await import('./server/worker' /* webpackExclude: /worker/ */);
    } catch (error) {
      logger.error('Failed to initialize worker', { error });
    }
  }
}

export async function register(options: RegisterOptions = {}) {
  const serviceName = options.serviceName || 'oracle-monitor';

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
    service: 'oracle-monitor',
  });

  Sentry.captureException(error);
}

/**
 * 处理请求错误
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation#onrequesterror
 */
export function onRequestError(
  error: Error,
  request: {
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
  },
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);

  logger.error('Request error detected', {
    message: errorMessage,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
    service: 'oracle-monitor',
  });

  // 使用 Sentry 捕获请求错误
  Sentry.captureException(error, {
    tags: {
      'request.path': request.path,
      'request.method': request.method,
      'route.path': context.routePath,
      'route.type': context.routeType,
      'router.kind': context.routerKind,
    },
    contexts: {
      request: {
        path: request.path,
        method: request.method,
      },
      route: {
        path: context.routePath,
        type: context.routeType,
        kind: context.routerKind,
      },
    },
  });
}
