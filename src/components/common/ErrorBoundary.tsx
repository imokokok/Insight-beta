'use client';

import React from 'react';

import { AlertTriangle, RefreshCw } from 'lucide-react';

import { useI18n } from '@/i18n';
import { logger } from '@/lib/logger';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary 组件 - 错误边界
 *
 * 捕获子组件中的 JavaScript 错误，防止整个应用崩溃
 *
 * @example
 * <ErrorBoundary fallback={<CustomErrorView />}>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Component error caught by ErrorBoundary:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // 自定义 fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * withErrorBoundary HOC - 为组件添加错误边界
 *
 * @example
 * const SafeComponent = withErrorBoundary(MyComponent);
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode,
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * ErrorBoundaryFallback 组件 - 错误边界回退 UI
 * 使用函数组件以便使用 useI18n hook
 */
function ErrorBoundaryFallback({
  error,
  onRetry,
}: {
  error?: Error;
  onRetry: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-rose-100 bg-rose-50/50 p-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
        <AlertTriangle className="h-6 w-6 text-rose-600" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-rose-900">{t('common:errorBoundary.componentError')}</h3>
      <p className="mb-4 max-w-md text-sm text-rose-700">
        {error?.message || t('common:componentLoading.unexpectedError')}
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm ring-1 ring-rose-200 transition-colors hover:bg-rose-50"
      >
        <RefreshCw className="h-4 w-4" />
        {t('common:errorBoundary.retry')}
      </button>
    </div>
  );
}
