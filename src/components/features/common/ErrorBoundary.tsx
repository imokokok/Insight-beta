'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    this.setState({ errorInfo: errorInfo.componentStack });

    if (this.props.onError) {
      this.props.onError(error, { componentStack: errorInfo.componentStack });
    }

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 rounded-full bg-red-50 p-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Something went wrong</h2>
          <p className="mb-4 max-w-md text-gray-600">
            We encountered an unexpected error. Please try reloading the page.
          </p>
          {this.state.error && (
            <p className="mb-4 rounded bg-gray-50 px-3 py-2 font-mono text-sm text-gray-400">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function createErrorBoundary(fallback?: ReactNode) {
  return function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
    return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
  };
}
