/**
 * Resource Preloader - 资源预加载组件
 *
 * 预加载关键资源以提升性能
 * - 字体预加载
 * - API 数据预加载
 * - 关键 JS/CSS 预加载
 */

'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

interface PreloadResource {
  href: string;
  as: 'font' | 'script' | 'style' | 'image' | 'fetch';
  type?: string;
  crossOrigin?: boolean;
}

// 关键资源列表
const CRITICAL_RESOURCES: PreloadResource[] = [
  // 字体预加载
  {
    href: '/fonts/inter-var.woff2',
    as: 'font',
    type: 'font/woff2',
    crossOrigin: true,
  },
];

// API 端点预加载
const API_ENDPOINTS = ['/api/oracle/stats', '/api/oracle/config'];

/**
 * 预加载单个资源
 */
function preloadResource(resource: PreloadResource): void {
  if (typeof window === 'undefined') return;

  // 检查是否已存在
  const existing = document.querySelector(`link[rel="preload"][href="${resource.href}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = resource.href;
  link.as = resource.as;

  if (resource.type) {
    link.type = resource.type;
  }

  if (resource.crossOrigin) {
    link.crossOrigin = 'anonymous';
  }

  document.head.appendChild(link);
  logger.debug('Resource preloaded', { href: resource.href, as: resource.as });
}

/**
 * 预加载 API 数据
 */
async function preloadApiData(endpoint: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'X-Preload': 'true',
      },
    });

    if (response.ok) {
      logger.debug('API data preloaded', { endpoint });
    }
  } catch (error) {
    // 预加载失败不阻塞主流程
    logger.debug('API preload failed (non-critical)', { endpoint, error });
  }
}

/**
 * 使用 Intersection Observer 预加载可视区域内的链接
 */
function setupLinkPrefetch(): () => void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return () => {};
  }

  const prefetchQueue = new Set<string>();
  let isProcessing = false;

  const processQueue = async () => {
    if (isProcessing || prefetchQueue.size === 0) return;
    isProcessing = true;

    const links = Array.from(prefetchQueue);
    prefetchQueue.clear();

    // 使用 requestIdleCallback 在空闲时预加载
    const schedule =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1));

    schedule(() => {
      links.forEach((href) => {
        // 使用 Next.js 路由预加载
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
      });
      isProcessing = false;
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const link = entry.target as HTMLAnchorElement;
          const href = link.getAttribute('href');
          if (href && href.startsWith('/') && !href.startsWith('/api/')) {
            prefetchQueue.add(href);
            observer.unobserve(link);
          }
        }
      });

      // 延迟处理队列
      setTimeout(processQueue, 100);
    },
    {
      rootMargin: '200px', // 提前 200px 开始预加载
      threshold: 0,
    },
  );

  // 观察所有内部链接
  const observeLinks = () => {
    document.querySelectorAll('a[href^="/"]').forEach((link) => {
      observer.observe(link);
    });
  };

  // 初始观察
  observeLinks();

  // 监听 DOM 变化
  const mutationObserver = new MutationObserver(() => {
    observeLinks();
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    observer.disconnect();
    mutationObserver.disconnect();
  };
}

/**
 * 资源预加载组件
 */
export function ResourcePreloader(): null {
  useEffect(() => {
    // 1. 预加载关键资源
    CRITICAL_RESOURCES.forEach(preloadResource);

    // 2. 延迟预加载 API 数据（不阻塞首屏）
    const apiPreloadTimeout = setTimeout(() => {
      API_ENDPOINTS.forEach(preloadApiData);
    }, 2000);

    // 3. 设置链接预加载
    const cleanupLinkPrefetch = setupLinkPrefetch();

    return () => {
      clearTimeout(apiPreloadTimeout);
      cleanupLinkPrefetch();
    };
  }, []);

  return null;
}

/**
 * 预加载特定路由
 */
export function prefetchRoute(route: string): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = route;
  document.head.appendChild(link);
}

/**
 * 预加载组件（动态导入）
 */
export function prefetchComponent(importFn: () => Promise<unknown>): void {
  if (typeof window === 'undefined') return;

  // 使用 requestIdleCallback 在空闲时预加载
  const schedule =
    (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1));

  schedule(() => {
    importFn().catch(() => {
      // 预加载失败不阻塞主流程
    });
  });
}

export default ResourcePreloader;
