/**
 * usePreload Hook
 *
 * 组件和路由预加载功能
 */

import { useCallback, useRef, useState } from 'react';

import { logger } from '@/lib/logger';

interface PreloadOptions {
  delay?: number;
  onPreload?: () => void;
}

interface PreloadResult {
  preloadProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
  isPreloaded: () => boolean;
}

/**
 * 组件预加载 Hook
 */
export function useComponentPreload(
  id: string,
  loader: () => Promise<unknown>,
  options: PreloadOptions = {},
): PreloadResult {
  const { delay = 100, onPreload } = options;
  const [isPreloadedState, setIsPreloadedState] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasPreloadedRef = useRef(false);

  const preload = useCallback(() => {
    if (hasPreloadedRef.current) return;

    timeoutRef.current = setTimeout(() => {
      loader()
        .then(() => {
          hasPreloadedRef.current = true;
          setIsPreloadedState(true);
          onPreload?.();
          logger.debug(`Preloaded component: ${id}`);
        })
        .catch((error) => {
          logger.warn(`Failed to preload component ${id}:`, { error });
        });
    }, delay);
  }, [id, loader, delay, onPreload]);

  const cancelPreload = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const isPreloaded = useCallback(() => isPreloadedState, [isPreloadedState]);

  return {
    preloadProps: {
      onMouseEnter: preload,
      onMouseLeave: cancelPreload,
      onFocus: preload,
      onBlur: cancelPreload,
    },
    isPreloaded,
  };
}

/**
 * 路由预加载 Hook
 */
export function usePreload() {
  const preloadedRoutes = useRef<Set<string>>(new Set());

  const preloadRoute = useCallback((route: string) => {
    if (preloadedRoutes.current.has(route)) return;

    // 使用 Next.js 的预加载机制
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    document.head.appendChild(link);

    preloadedRoutes.current.add(route);
    logger.debug(`Preloaded route: ${route}`);
  }, []);

  const isRoutePreloaded = useCallback((route: string) => preloadedRoutes.current.has(route), []);

  return { preloadRoute, isRoutePreloaded };
}
