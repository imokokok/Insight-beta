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
