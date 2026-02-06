/**
 * LazyComponent - 懒加载组件包装器
 *
 * 提供统一的懒加载功能，支持加载状态、错误处理和重试机制
 */

'use client';

import React, { Suspense, lazy } from 'react';
import type { ComponentType, ReactNode } from 'react';

import { RefreshCw, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface LazyComponentOptions {
  /** 显示名称 */
  displayName?: string;
  /** 预加载延迟（毫秒） */
  preloadDelay?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

interface LazyComponentWrapperProps {
  /** 加载中显示的组件 */
  fallback?: ReactNode;
  /** 错误时显示的组件 */
  errorComponent?: ReactNode;
  /** 包裹的子组件 */
  children: ReactNode;
  /** 自定义类名 */
  className?: string;
}

interface LazyLoadErrorProps {
  error: Error;
  onRetry: () => void;
}

// ============================================================================
// Error Boundary
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

class LazyLoadErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const error = this.state.error;
      if (!error) return null;
      return <LazyLoadError error={error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

// ============================================================================
// Error Component
// ============================================================================

function LazyLoadError({ error, onRetry }: LazyLoadErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
      <h3 className="mb-2 text-lg font-semibold">加载失败</h3>
      <p className="mb-4 max-w-md text-sm text-gray-500">
        {error.message || '组件加载时发生错误，请重试'}
      </p>
      <Button onClick={onRetry} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        重试
      </Button>
    </div>
  );
}

// ============================================================================
// Loading Component
// ============================================================================

interface LazyLoadingProps {
  className?: string;
  text?: string;
}

export function LazyLoading({ className, text = '加载中...' }: LazyLoadingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8', className)}>
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      {text && <p className="mt-4 text-sm text-gray-500">{text}</p>}
    </div>
  );
}

// ============================================================================
// Lazy Component Factory
// ============================================================================

/**
 * 创建懒加载组件
 *
 * @example
 * const LazyChart = createLazyComponent(
 *   () => import('./HeavyChart'),
 *   { displayName: 'HeavyChart' }
 * );
 *
 * // 使用
 * <LazyChart data={data} />
 */
export function createLazyComponent<T extends ComponentType<Record<string, unknown>>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {},
): React.FC<React.ComponentProps<T>> {
  const { displayName = 'LazyComponent', retryCount = 3, retryDelay = 1000 } = options;

  const LazyComponent = lazy(() => {
    return retryImport(importFn, retryCount, retryDelay);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WrappedComponent: React.FC<any> = (props) => {
    return (
      <LazyLoadErrorBoundary onError={(error) => console.error('[LazyComponent]', error)}>
        <Suspense fallback={<LazyLoading />}>
          <LazyComponent {...props} />
        </Suspense>
      </LazyLoadErrorBoundary>
    );
  };

  WrappedComponent.displayName = `Lazy(${displayName})`;

  return WrappedComponent as React.FC<React.ComponentProps<T>>;
}

/**
 * 带重试机制的导入函数
 */
async function retryImport<T>(
  importFn: () => Promise<T>,
  maxRetries: number,
  delay: number,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        console.warn(`[LazyComponent] Import failed, retrying... (${attempt + 1}/${maxRetries})`);
        await sleep(delay * Math.pow(2, attempt)); // 指数退避
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Lazy Component Wrapper
// ============================================================================

/**
 * 懒加载组件包装器
 *
 * @example
 * <LazyComponentWrapper>
 *   <HeavyComponent />
 * </LazyComponentWrapper>
 */
export function LazyComponentWrapper({
  fallback,
  errorComponent,
  children,
  className,
}: LazyComponentWrapperProps) {
  return (
    <LazyLoadErrorBoundary fallback={errorComponent}>
      <Suspense fallback={fallback || <LazyLoading className={className} />}>{children}</Suspense>
    </LazyLoadErrorBoundary>
  );
}

// ============================================================================
// Preload Utilities
// ============================================================================

const preloadCache = new Set<string>();

/**
 * 预加载组件
 *
 * @example
 * // 在鼠标悬停时预加载
 * onMouseEnter={() => preloadComponent(() => import('./HeavyChart'))}
 */
export function preloadComponent<T>(
  importFn: () => Promise<T>,
  componentId?: string,
): Promise<T | undefined> {
  const id = componentId || importFn.toString();

  if (preloadCache.has(id)) {
    return Promise.resolve(undefined);
  }

  preloadCache.add(id);

  return importFn().catch((error) => {
    preloadCache.delete(id);
    console.warn('[LazyComponent] Preload failed:', error);
    return undefined;
  });
}

/**
 * 延迟预加载（在空闲时预加载）
 *
 * @example
 * useEffect(() => {
 *   preloadComponentIdle(() => import('./HeavyChart'));
 * }, []);
 */
export function preloadComponentIdle<T>(importFn: () => Promise<T>, delay: number = 2000): void {
  if (typeof window === 'undefined') return;

  const doPreload = () => {
    preloadComponent(importFn);
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      setTimeout(doPreload, delay);
    });
  } else {
    setTimeout(doPreload, delay);
  }
}

/**
 * 智能预加载（基于用户行为）
 *
 * @example
 * useSmartPreload({
 *   '/dashboard': () => import('./DashboardPage'),
 *   '/settings': () => import('./SettingsPage'),
 * });
 */
export function useSmartPreload(
  routeMap: Record<string, () => Promise<unknown>>,
  options: { delay?: number; rootMargin?: string } = {},
): void {
  const { delay = 1000, rootMargin = '100px' } = options;

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const links = document.querySelectorAll('a[href^="/"]');
    const observers: IntersectionObserver[] = [];

    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;

      const importFn = routeMap[href];
      if (!importFn) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setTimeout(() => {
                preloadComponent(importFn, href);
              }, delay);
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin },
      );

      observer.observe(link);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [routeMap, delay, rootMargin]);
}

// ============================================================================
// Export
// ============================================================================

const LazyComponentExports = {
  createLazyComponent,
  LazyComponentWrapper,
  LazyLoading,
  preloadComponent,
  preloadComponentIdle,
  useSmartPreload,
};

export default LazyComponentExports;
