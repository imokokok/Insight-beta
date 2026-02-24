'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { useI18n } from '@/i18n';
import { logger } from '@/shared/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { t } = useI18n();

  return (
    <motion.div
      className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <AlertTriangle className="mb-3 h-10 w-10 text-red-500 dark:text-red-400" />
      <h3 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">
        {t('error.componentLoadFailed')}
      </h3>
      <p className="mb-4 max-w-xs text-center text-sm text-red-600 dark:text-red-300">
        {t('error.tryRefresh')}
      </p>
      {error && process.env.NODE_ENV === 'development' && (
        <pre className="mb-4 max-w-full overflow-auto rounded bg-red-100 p-2 text-xs text-red-800 dark:bg-red-900 dark:text-red-200">
          {error.message}
        </pre>
      )}
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
      >
        <RefreshCw className="h-4 w-4" />
        {t('error.retry')}
      </button>
    </motion.div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error', { error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}
