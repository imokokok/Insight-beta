/**
 * Performance - 前端性能优化工具
 *
 * 包含代码分割、懒加载、预加载等优化工具
 */

import { type ComponentType, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';

// ============================================================================
// 动态导入配置
// ============================================================================

export interface DynamicImportOptions {
  ssr?: boolean;
  loading?: ReactNode;
}

/**
 * 创建动态导入组件（带加载状态）
 */
export function createDynamicComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: DynamicImportOptions = {},
) {
  const { ssr = false, loading } = options;

  return dynamic(importFn, {
    ssr,
    loading: loading ? () => <>{loading}</> : () => <DefaultLoadingComponent />,
  });
}

function DefaultLoadingComponent() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
    </div>
  );
}

// ============================================================================
// 路由级别代码分割
// ============================================================================

// 注意：动态导入需要组件有默认导出
// 以下组件使用命名导出，因此暂时注释掉
// 如需使用，请确保组件有默认导出或创建包装组件

// export const LazyPriceHistoryChart = createDynamicComponent(
//   () => import('@/components/features/dashboard/PriceHistoryChart'),
//   { loading: <ChartSkeleton /> },
// );

// export const LazyAssertionList = createDynamicComponent(
//   () => import('@/components/features/assertion/AssertionList'),
//   { loading: <TableSkeleton /> },
// );

// export const LazyDisputeList = createDynamicComponent(
//   () => import('@/components/features/dispute/DisputeList'),
//   { loading: <TableSkeleton /> },
// );

// ============================================================================
// 预加载策略
// ============================================================================

const prefetchQueue: string[] = [];
let isPrefetching = false;

/**
 * 预加载路由
 */
export function prefetchRoute(route: string): void {
  if (typeof window === 'undefined') return;

  // 使用 Next.js 的预加载
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = route;
  document.head.appendChild(link);
}

/**
 * 智能预加载（基于用户行为）
 * @returns 清理函数，用于移除事件监听器
 */
export function setupSmartPrefetch(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleMouseOver = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a[href^="/"]');

    if (link) {
      const href = link.getAttribute('href');
      if (href && !prefetchQueue.includes(href)) {
        prefetchQueue.push(href);
        processPrefetchQueue();
      }
    }
  };

  // 使用节流优化性能
  const throttledHandler = throttle((e: unknown) => handleMouseOver(e as MouseEvent), 100);

  // 监听鼠标悬停
  document.addEventListener('mouseover', throttledHandler);

  // 返回清理函数
  return () => {
    document.removeEventListener('mouseover', throttledHandler);
  };
}

function processPrefetchQueue(): void {
  if (isPrefetching || prefetchQueue.length === 0) return;

  isPrefetching = true;
  const route = prefetchQueue.shift();

  if (route) {
    prefetchRoute(route);
  }

  setTimeout(() => {
    isPrefetching = false;
    processPrefetchQueue();
  }, 100);
}

// ============================================================================
// 图片优化
// ============================================================================

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  placeholder?: 'blur' | 'empty';
}

/**
 * 生成响应式图片配置
 */
export function generateResponsiveImageConfig(baseWidth: number): {
  sizes: string;
  srcSet: string;
} {
  const sizes = [320, 640, 960, 1280, 1920];
  const relevantSizes = sizes.filter((size) => size <= baseWidth * 2);

  return {
    sizes: relevantSizes.map((size) => `${size}w`).join(', '),
    srcSet: relevantSizes.map((size) => `{{imageUrl}}?w=${size}`).join(', '),
  };
}

// ============================================================================
// 虚拟列表配置
// ============================================================================

export interface VirtualListConfig {
  itemHeight: number;
  overscan: number;
  containerHeight: number;
}

export const defaultVirtualListConfig: VirtualListConfig = {
  itemHeight: 64,
  overscan: 5,
  containerHeight: 600,
};

// ============================================================================
// 性能监控
// ============================================================================

export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

/**
 * 收集性能指标
 */
export function collectPerformanceMetrics(): PerformanceMetrics {
  if (typeof window === 'undefined') return {};

  const metrics: PerformanceMetrics = {};

  // Navigation Timing
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  if (navigation) {
    metrics.ttfb = navigation.responseStart - navigation.startTime;
  }

  // Paint Timing
  const paintEntries = performance.getEntriesByType('paint');
  paintEntries.forEach((entry) => {
    if (entry.name === 'first-contentful-paint') {
      metrics.fcp = entry.startTime;
    }
  });

  return metrics;
}

/**
 * 上报性能指标
 */
export function reportPerformanceMetrics(metrics: PerformanceMetrics): void {
  // 可以发送到分析服务
  logger.debug('Performance Metrics collected', metrics as Record<string, unknown>);

  // 示例：发送到 API
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics),
      keepalive: true,
    }).catch(() => {
      // 忽略错误
    });
  }
}

// ============================================================================
// 防抖和节流
// ============================================================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// ============================================================================
// 资源优先级
// ============================================================================

/**
 * 设置资源加载优先级
 */
export function setResourcePriority(selector: string, priority: 'high' | 'low' | 'auto'): void {
  if (typeof window === 'undefined') return;

  const elements = document.querySelectorAll(selector);
  elements.forEach((el) => {
    if (el instanceof HTMLImageElement || el instanceof HTMLLinkElement) {
      el.setAttribute('fetchpriority', priority);
    }
  });
}

// ============================================================================
// Service Worker 注册
// ============================================================================

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        logger.info('Service Worker registered', { scope: registration.scope });
      })
      .catch((error) => {
        logger.error('Service Worker registration failed', { error });
      });
  });
}
