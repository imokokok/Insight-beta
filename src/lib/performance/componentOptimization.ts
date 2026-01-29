import type { ComponentType } from 'react';
import React, { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Loading fallback components
export const TableSkeleton = (): React.ReactElement =>
  React.createElement(
    'div',
    { className: 'space-y-2' },
    React.createElement(Skeleton, { className: 'h-8 w-full' }),
    React.createElement(Skeleton, { className: 'h-8 w-full' }),
    React.createElement(Skeleton, { className: 'h-8 w-full' }),
    React.createElement(Skeleton, { className: 'h-8 w-full' }),
    React.createElement(Skeleton, { className: 'h-8 w-full' }),
  );

export const CardSkeleton = (): React.ReactElement =>
  React.createElement(
    'div',
    { className: 'space-y-3' },
    React.createElement(Skeleton, { className: 'h-4 w-1/3' }),
    React.createElement(Skeleton, { className: 'h-8 w-2/3' }),
    React.createElement(Skeleton, { className: 'h-20 w-full' }),
  );

export const ChartSkeleton = (): React.ReactElement =>
  React.createElement(
    'div',
    { className: 'space-y-3' },
    React.createElement(Skeleton, { className: 'h-6 w-1/4' }),
    React.createElement(Skeleton, { className: 'h-[300px] w-full' }),
  );

export const FormSkeleton = (): React.ReactElement =>
  React.createElement(
    'div',
    { className: 'space-y-4' },
    React.createElement(Skeleton, { className: 'h-10 w-full' }),
    React.createElement(Skeleton, { className: 'h-10 w-full' }),
    React.createElement(Skeleton, { className: 'h-10 w-full' }),
    React.createElement(Skeleton, { className: 'h-10 w-1/3' }),
  );

// Lazy load components with preloading
interface LazyComponentOptions {
  preload?: boolean;
  fallback?: React.ReactNode;
}

export function createLazyComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {},
) {
  const LazyComponent = lazy(importFn);
  let preloaded = false;

  const Component = (props: React.ComponentProps<T>) => {
    const fallback = options.fallback || React.createElement(CardSkeleton);

    return React.createElement(
      Suspense,
      { fallback },
      React.createElement(
        LazyComponent as unknown as React.ComponentType<Record<string, unknown>>,
        props as Record<string, unknown>,
      ),
    );
  };

  Component.preload = (): Promise<void> => {
    if (!preloaded) {
      preloaded = true;
      return importFn().then(() => undefined);
    }
    return Promise.resolve();
  };

  return Component;
}

// Preload critical components on idle
export function preloadCriticalComponents() {
  if (typeof window === 'undefined') return;

  const preload = () => {
    // Preload components when browser is idle
    const components = [
      () => import('@/components/features/oracle/OracleCharts'),
      () => import('@/components/features/oracle/OracleStatsBanner'),
      () => import('@/components/features/common/PnLCalculator'),
    ];

    components.forEach((importFn, index) => {
      setTimeout(() => {
        importFn();
      }, index * 100);
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(preload, { timeout: 2000 });
  } else {
    setTimeout(preload, 1000);
  }
}

// Intersection Observer based lazy loading
export function useIntersectionObserver(
  callback: () => void,
  options: IntersectionObserverInit = {},
) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback();
            observer.unobserve(element);
          }
        });
      },
      { threshold: 0.1, ...options },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [callback, options]);

  return ref;
}

// Virtual list configuration
interface VirtualListConfig {
  itemHeight: number;
  overscan?: number;
  containerHeight?: number;
}

export function useVirtualList<T>(items: T[], config: VirtualListConfig) {
  const { itemHeight, overscan = 5 } = config;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(0);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
  };
}

// Image optimization
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
}) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  return React.createElement(
    'div',
    {
      className: `relative ${className || ''}`,
      style: { width, height },
    },
    [
      !loaded &&
        !error &&
        React.createElement(Skeleton, {
          key: 'skeleton',
          className: 'absolute inset-0',
        }),
      error &&
        React.createElement(
          'div',
          {
            key: 'error',
            className:
              'absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400',
          },
          'Failed to load',
        ),
      !error &&
        React.createElement('img', {
          key: 'img',
          src,
          alt,
          width,
          height,
          loading: priority ? 'eager' : 'lazy',
          decoding: priority ? 'sync' : 'async',
          onLoad: () => setLoaded(true),
          onError: () => setError(true),
          className: `transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`,
        }),
    ],
  );
};

// Code splitting for routes
export const LazyOraclePage = createLazyComponent(() => import('@/app/oracle/page'), {
  fallback: React.createElement(CardSkeleton),
});

export const LazyDisputesPage = createLazyComponent(() => import('@/app/disputes/page'), {
  fallback: React.createElement(TableSkeleton),
});

export const LazyAlertsPage = createLazyComponent(() => import('@/app/alerts/page'), {
  fallback: React.createElement(CardSkeleton),
});

// Memoization helpers
export function memoizeComponent<P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean,
) {
  return React.memo(Component, areEqual);
}

// Deep comparison for complex props
export function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== typeof obj2) return false;
  if (typeof obj1 !== 'object' || obj1 === null || obj2 === null) return false;

  const keys1 = Object.keys(obj1 as object);
  const keys2 = Object.keys(obj2 as object);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (
      !deepEqual((obj1 as Record<string, unknown>)[key], (obj2 as Record<string, unknown>)[key])
    ) {
      return false;
    }
  }

  return true;
}

// Performance monitoring hook
export function useRenderCount(componentName: string) {
  const renderCount = React.useRef(0);

  React.useEffect(() => {
    renderCount.current++;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${componentName}] Render count:`, renderCount.current);
    }
  });

  return renderCount.current;
}

export function useRenderTime(componentName: string) {
  const startTime = React.useRef<number>(0);

  React.useEffect(() => {
    const endTime = performance.now();
    const duration = endTime - startTime.current;
    if (process.env.NODE_ENV === 'development' && startTime.current > 0) {
      console.log(`[${componentName}] Render time:`, duration.toFixed(2), 'ms');
    }
  });

  startTime.current = performance.now();
}

// Bundle size optimization - dynamic imports
export async function loadChartLibrary() {
  const Recharts = await import('recharts');
  return Recharts;
}

// Date library dynamic import - date-fns may not be installed
export async function loadDateLibrary() {
  // Fallback implementation - date-fns is optional
  return {
    format: (date: Date, _format: string) => date.toISOString(),
    parseISO: (str: string) => new Date(str),
  };
}

// CSS containment for performance
export const containmentStyles = {
  containStrict: { contain: 'strict' } as React.CSSProperties,
  containLayout: { contain: 'layout' } as React.CSSProperties,
  containPaint: { contain: 'paint' } as React.CSSProperties,
  containContent: { contain: 'content' } as React.CSSProperties,
};

// Debounced resize observer
export function useDebouncedResize(
  callback: (entry: ResizeObserverEntry) => void,
  delay: number = 250,
) {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        entries.forEach(callback);
      }, delay);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      observer.disconnect();
    };
  }, [callback, delay]);

  return null;
}
