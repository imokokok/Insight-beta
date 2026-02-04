'use client';

import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 错误边界组件
 *
 * 捕获子组件树中的 JavaScript 错误，防止整个应用崩溃
 * 提供友好的错误提示和恢复选项
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });

    // 调用外部错误处理回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 记录错误日志
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 可以在这里发送错误到监控服务
    const sentry =
      (typeof window !== 'undefined' &&
        (
          window as unknown as {
            Sentry?: {
              captureException: (
                error: Error,
                context?: { extra?: Record<string, unknown> },
              ) => void;
            };
          }
        ).Sentry) ||
      null;
    if (sentry) {
      sentry.captureException(error, {
        extra: { errorInfo: errorInfo.componentStack },
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // 使用自定义 fallback 或默认错误 UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

/**
 * 小型错误降级 UI（用于组件级别）
 */
interface MiniErrorFallbackProps {
  onRetry: () => void;
}

function MiniErrorFallback({ onRetry }: MiniErrorFallbackProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-center gap-2 text-red-800">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm font-medium">{t('common.errorBoundary.componentError')}</span>
      </div>
      <button onClick={onRetry} className="mt-2 text-sm text-red-600 hover:text-red-800">
        {t('common.errorBoundary.clickToRetry')}
      </button>
    </div>
  );
}

/**
 * 默认错误降级 UI
 */
interface DefaultErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
}

function DefaultErrorFallback({ error, onRetry }: DefaultErrorFallbackProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="mb-6 rounded-full bg-red-100 p-4">
        <AlertTriangle className="h-12 w-12 text-red-600" aria-hidden="true" />
      </div>

      <h2 className="mb-2 text-2xl font-bold text-gray-900">{t('common.errorBoundary.title')}</h2>

      <p className="mb-6 max-w-md text-gray-600">{t('common.errorBoundary.description')}</p>

      {process.env.NODE_ENV === 'development' && error && (
        <div className="mb-6 max-w-2xl overflow-auto rounded-lg bg-gray-100 p-4 text-left">
          <p className="mb-2 font-mono text-sm text-red-600">
            {error.name}: {error.message}
          </p>
          <pre className="text-xs text-gray-700">{error.stack}</pre>
        </div>
      )}

      <div className="flex gap-4">
        <Button onClick={onRetry} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('common.errorBoundary.retry')}
        </Button>

        <Link href="/">
          <Button className="flex items-center gap-2">
            <Home className="h-4 w-4" aria-hidden="true" />
            {t('common.errorBoundary.backToHome')}
          </Button>
        </Link>
      </div>
    </div>
  );
}

/**
 * 小型错误边界（用于组件级别）
 */
interface MiniErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface MiniErrorBoundaryState {
  hasError: boolean;
}

export class MiniErrorBoundary extends Component<MiniErrorBoundaryProps, MiniErrorBoundaryState> {
  constructor(props: MiniErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MiniErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MiniErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <MiniErrorFallback onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

/**
 * 异步错误边界（处理 Promise 错误）
 */
interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface AsyncErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AsyncErrorBoundary extends Component<
  AsyncErrorBoundaryProps,
  AsyncErrorBoundaryState
> {
  private promiseRejectionHandler: (event: PromiseRejectionEvent) => void;

  constructor(props: AsyncErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };

    this.promiseRejectionHandler = (event: PromiseRejectionEvent) => {
      this.setState({ hasError: true, error: event.reason });
    };
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.promiseRejectionHandler);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.promiseRejectionHandler);
  }

  static getDerivedStateFromError(error: Error): AsyncErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
