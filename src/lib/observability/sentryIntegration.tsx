import { useEffect, useCallback, useRef } from 'react';

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

declare global {
  interface Window {
    Sentry?: {
      init: (config: SentryConfig) => void;
      setUser: (user: SentryUser | null) => void;
      setTag: (key: string, value: string) => void;
      setContext: (name: string, context: Record<string, unknown>) => void;
      captureException: (error: unknown, context?: Record<string, unknown>) => string;
      captureMessage: (message: string, level?: SentrySeverity) => string;
      addBreadcrumb: (breadcrumb: SentryBreadcrumb) => void;
      startTransaction: (context: { name: string; op: string }) => SentryTransaction;
      withScope: (callback: (scope: unknown) => void) => void;
      close: () => Promise<void>;
    };
  }
}

export interface SentryConfig {
  dsn: string;
  environment?: string;
  release?: string;
  maxBreadcrumbs?: number;
  attachStacktrace?: boolean;
  sendDefaultPii?: boolean;
  serverName?: string;
  beforeSend?: (event: SentryEvent, hint: SentryHint) => SentryEvent | null;
  beforeSendTransaction?: (event: SentryTransactionEvent) => SentryTransactionEvent | null;
  initialScope?: string | { [key: string]: unknown };
  maxValueLength?: number;
  sampleRate?: number;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
}

export interface SentryUser {
  id: string;
  email?: string;
  username?: string;
  ip_address?: string;
  segment?: string;
  [key: string]: unknown;
}

export interface SentryEvent {
  event_id?: string;
  message?: string;
  level?: SentrySeverity;
  logger?: string;
  platform?: string;
  timestamp?: number;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  contexts?: Record<string, Record<string, unknown>>;
  breadcrumbs?: SentryBreadcrumb[];
  request?: SentryRequest;
  exception?: SentryException;
}

export interface SentryTransactionEvent extends SentryEvent {
  type: 'transaction';
  transaction: string;
  spans?: SentrySpan[];
  measurements?: Record<string, { value: number; unit: string }>;
  trace?: {
    trace_id: string;
    span_id: string;
    parent_span_id?: string;
  };
}

export interface SentryException {
  values: Array<{
    type: string;
    value: string;
    stacktrace?: {
      frames: SentryStackFrame[];
    };
    mechanism?: {
      type: string;
      handled: boolean;
    };
  }>;
}

export interface SentryStackFrame {
  filename?: string;
  lineno?: number;
  colno?: number;
  function?: string;
  module?: string;
  abs_path?: string;
  context?: string[];
  pre_context?: string[];
  post_context?: string[];
  in_app?: boolean;
}

export interface SentryHint {
  originalException?: unknown;
  syntheticException?: unknown;
}

export interface SentryBreadcrumb {
  type?: string;
  category?: string;
  message?: string;
  level?: SentrySeverity;
  timestamp?: number;
  data?: Record<string, unknown>;
}

export interface SentryRequest {
  url?: string;
  method?: string;
  query_string?: string;
  headers?: Record<string, string>;
  cookies?: string;
  data?: unknown;
  env?: Record<string, string>;
}

export interface SentrySpan {
  span_id: string;
  trace_id: string;
  parent_span_id?: string;
  op: string;
  description?: string;
  start_timestamp: number;
  timestamp: number;
  status?: string;
  data?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export interface SentryTransaction {
  startChild: (options: { op: string; description: string }) => SentrySpan;
  finish: () => void;
  setStatus: (status: string) => void;
  setTag: (key: string, value: string) => void;
  setData: (key: string, value: unknown) => void;
}

export type SentrySeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug' | 'log';

interface UseSentryOptions {
  dsn: string;
  environment?: string;
  release?: string;
  userId?: string;
  userEmail?: string;
  tags?: Record<string, string>;
  maxBreadcrumbs?: number;
  enabled?: boolean;
  onError?: (error: unknown, eventId: string) => void;
  onUncaughtException?: (error: Error, eventId: string) => void;
  onUnhandledRejection?: (reason: unknown, eventId: string) => void;
}

interface UseSentryReturn {
  captureException: (error: unknown, context?: Record<string, unknown>) => string;
  captureMessage: (message: string, level?: SentrySeverity) => string;
  addBreadcrumb: (breadcrumb: SentryBreadcrumb) => void;
  setUser: (user: SentryUser | null) => void;
  setTag: (key: string, value: string) => void;
  setContext: (name: string, context: Record<string, unknown>) => void;
  startTransaction: (name: string, op: string) => SentryTransaction | null;
  close: () => Promise<void>;
  isInitialized: boolean;
}

export function useSentry(options: UseSentryOptions): UseSentryReturn {
  const {
    dsn,
    environment = process.env.NODE_ENV || 'development',
    release,
    userId,
    userEmail,
    tags = {},
    maxBreadcrumbs = 100,
    enabled = true,
    onError,
    onUncaughtException,
    onUnhandledRejection,
  } = options;

  const isInitialized = useRef(false);
  const initializationPromise = useRef<Promise<void> | null>(null);
  const errorHandlerRef = useRef<((event: ErrorEvent) => void) | null>(null);
  const rejectionHandlerRef = useRef<((event: PromiseRejectionEvent) => void) | null>(null);

  const initializeSentry = useCallback(async () => {
    if (!enabled || isInitialized.current || !dsn) {
      return;
    }

    if (typeof window === 'undefined') return;

    try {
      const script = document.createElement('script');
      script.src = 'https://browser.sentry-cdn.com/7.100.1/bundle.min.js';
      script.async = true;
      script.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Sentry SDK'));
        document.head.appendChild(script);
      });

      if (window.Sentry) {
        window.Sentry.init({
          dsn,
          environment,
          release,
          maxBreadcrumbs,
          attachStacktrace: true,
          sendDefaultPii: false,
          serverName: typeof window !== 'undefined' ? window.location.hostname : undefined,
          initialScope: {
            tags: {
              ...tags,
              app: 'insight-oracle',
            },
          },
          beforeSend: (event, hint) => {
            const error = hint.originalException;
            if (onError) {
              const eventId = event.event_id || 'unknown';
              onError(error, eventId);
            }
            return event;
          },
          beforeSendTransaction: (event) => {
            return event;
          },
        });

        if (userId) {
          window.Sentry.setUser({
            id: userId,
            email: userEmail,
          });
        }

        Object.entries(tags).forEach(([key, value]) => {
          window.Sentry?.setTag(key, value);
        });

        window.Sentry.setContext('runtime', {
          browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
        });

        isInitialized.current = true;

        if (typeof window !== 'undefined') {
          // Store handlers in refs for cleanup
          errorHandlerRef.current = (event: ErrorEvent) => {
            if (window.Sentry && event.error) {
              const eventId = window.Sentry.captureException(event.error, {
                contexts: {
                  navigation: {
                    current_url: window.location.href,
                  },
                },
              });
              if (onUncaughtException) {
                onUncaughtException(event.error, eventId);
              }
            }
          };

          rejectionHandlerRef.current = (event: PromiseRejectionEvent) => {
            if (window.Sentry && event.reason) {
              const eventId = window.Sentry.captureException(event.reason, {
                contexts: {
                  promise: {
                    reason: String(event.reason),
                  },
                },
              });
              if (onUnhandledRejection) {
                onUnhandledRejection(event.reason, eventId);
              }
            }
          };

          window.addEventListener('error', errorHandlerRef.current);
          window.addEventListener('unhandledrejection', rejectionHandlerRef.current);
        }
      }
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }, [
    dsn,
    environment,
    release,
    userId,
    userEmail,
    tags,
    maxBreadcrumbs,
    enabled,
    onError,
    onUncaughtException,
    onUnhandledRejection,
  ]);

  useEffect(() => {
    if (!initializationPromise.current) {
      initializationPromise.current = initializeSentry();
    }

    // Cleanup function to remove event listeners
    return () => {
      if (typeof window !== 'undefined') {
        if (errorHandlerRef.current) {
          window.removeEventListener('error', errorHandlerRef.current);
          errorHandlerRef.current = null;
        }
        if (rejectionHandlerRef.current) {
          window.removeEventListener('unhandledrejection', rejectionHandlerRef.current);
          rejectionHandlerRef.current = null;
        }
      }
    };
  }, [initializeSentry]);

  const captureException = useCallback(
    (error: unknown, context?: Record<string, unknown>): string => {
      if (!window.Sentry || !isInitialized.current) {
        console.warn('Sentry not initialized, logging to console:', error);
        return 'mock-event-id';
      }

      const contexts = context ? { additional: context } : undefined;
      return window.Sentry.captureException(error, { contexts });
    },
    [],
  );

  const captureMessage = useCallback((message: string, level: SentrySeverity = 'info'): string => {
    if (!window.Sentry || !isInitialized.current) {
      console.warn('Sentry not initialized, logging to console:', message);
      return 'mock-event-id';
    }

    return window.Sentry.captureMessage(message, level);
  }, []);

  const addBreadcrumb = useCallback((breadcrumb: SentryBreadcrumb) => {
    if (!window.Sentry || !isInitialized.current) return;

    window.Sentry.addBreadcrumb({
      ...breadcrumb,
      timestamp: breadcrumb.timestamp || Date.now() / 1000,
    });
  }, []);

  const setUser = useCallback((user: SentryUser | null) => {
    if (!window.Sentry || !isInitialized.current) return;
    window.Sentry.setUser(user);
  }, []);

  const setTag = useCallback((key: string, value: string) => {
    if (!window.Sentry || !isInitialized.current) return;
    window.Sentry.setTag(key, value);
  }, []);

  const setContext = useCallback((name: string, context: Record<string, unknown>) => {
    if (!window.Sentry || !isInitialized.current) return;
    window.Sentry.setContext(name, context);
  }, []);

  const startTransaction = useCallback((name: string, op: string): SentryTransaction | null => {
    if (!window.Sentry || !isInitialized.current) return null;

    return window.Sentry.startTransaction({ name, op });
  }, []);

  const close = useCallback(async () => {
    if (!window.Sentry || !isInitialized.current) return;
    await window.Sentry.close();
    isInitialized.current = false;
  }, []);

  return {
    captureException,
    captureMessage,
    addBreadcrumb,
    setUser,
    setTag,
    setContext,
    startTransaction,
    close,
    isInitialized: isInitialized.current,
  };
}

export function usePerformanceMonitoring() {
  const { startTransaction, addBreadcrumb, setContext } = useSentry({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
    enabled: typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  });

  const measureComponentRender = useCallback(
    (componentName: string) => {
      const start = performance.now();
      let transaction: SentryTransaction | null = null;

      if (window.Sentry?.startTransaction) {
        transaction = startTransaction(componentName, 'render');
      }

      return () => {
        const duration = performance.now() - start;

        if (transaction) {
          transaction.setData('render_duration', duration);
          transaction.setStatus(duration > 100 ? 'slow' : 'ok');
          transaction.finish();
        }

        if (duration > 100) {
          addBreadcrumb({
            category: 'performance',
            message: `Slow render: ${componentName}`,
            level: 'warning',
            data: {
              component: componentName,
              duration: Math.round(duration),
              threshold: 100,
            },
          });
        }
      };
    },
    [startTransaction, addBreadcrumb],
  );

  const measureAsyncOperation = useCallback(
    async function <T>(
      operationName: string,
      operation: () => Promise<T>,
      metadata?: Record<string, unknown>,
    ): Promise<T> {
      const start = performance.now();
      let transaction: SentryTransaction | null = null;

      if (window.Sentry?.startTransaction) {
        transaction = startTransaction(operationName, 'async');
      }

      try {
        const result = await operation();
        const duration = performance.now() - start;

        if (transaction) {
          transaction.setData('duration', duration);
          transaction.setStatus('ok');
          if (metadata) {
            Object.entries(metadata).forEach(([key, value]) => {
              transaction?.setData(key, value);
            });
          }
          transaction.finish();
        }

        return result;
      } catch (error) {
        const duration = performance.now() - start;

        if (transaction) {
          transaction.setData('duration', duration);
          transaction.setStatus('error');
          transaction.setData('error', String(error));
          transaction.finish();
        }

        throw error;
      }
    },
    [startTransaction],
  );

  const trackWebVitals = useCallback(() => {
    if (typeof window === 'undefined') return;

    const metrics: Record<string, number> = {};

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          metrics.lcp = entry.startTime;
        } else if (entry.entryType === 'first-input') {
          metrics.fid = entry.startTime;
        } else if (entry.entryType === 'layout-shift') {
          const layoutShiftEntry = entry as LayoutShift;
          if (!layoutShiftEntry.hadRecentInput) {
            metrics.cls = (metrics.cls || 0) + layoutShiftEntry.value;
          }
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch {
      console.warn('PerformanceObserver not supported');
    }

    return () => observer.disconnect();
  }, []);

  return {
    measureComponentRender,
    measureAsyncOperation,
    trackWebVitals,
    setContext,
    addBreadcrumb,
  };
}

export function useErrorBoundaryFallback(error: Error, resetError: () => void) {
  const { captureException } = useSentry({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
    enabled: typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  });

  useEffect(() => {
    captureException(error, {
      component: 'ErrorBoundary',
      resetFunction: 'resetError',
    });
  }, [error, captureException]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Something went wrong</h2>
        <p className="mb-6 text-gray-600">
          An unexpected error occurred. We&apos;ve been notified and will look into it.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={resetError}
            className="rounded-lg bg-purple-600 px-6 py-2 text-white transition-colors hover:bg-purple-700"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-gray-100 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-200"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}
