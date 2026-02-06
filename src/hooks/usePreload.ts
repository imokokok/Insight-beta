import { useEffect, useCallback, useRef } from 'react';
import { preloadManager, preloadCommonLibraries, type PreloadConfig } from '@/lib/dynamic-imports';

/**
 * 预加载策略类型
 */
export type PreloadStrategy = 'immediate' | 'idle' | 'delay' | 'viewport' | 'interaction';

/**
 * 预加载配置项
 */
interface PreloadItem {
  /** 模块唯一标识 */
  key: string;
  /** 导入函数 */
  loader: () => Promise<unknown>;
  /** 预加载策略 */
  strategy?: PreloadStrategy;
  /** 延迟时间（仅用于 delay 策略） */
  delay?: number;
  /** 视口选择器（仅用于 viewport 策略） */
  viewportSelector?: string;
  /** 交互选择器（仅用于 interaction 策略） */
  interactionSelector?: string;
  /** 交互事件类型 */
  interactionEvent?: 'mouseenter' | 'click' | 'focus';
}

/**
 * 预加载 Hook 配置
 */
interface UsePreloadOptions {
  /** 是否在组件挂载时自动预加载 */
  autoPreload?: boolean;
  /** 预加载完成回调 */
  onPreloaded?: (key: string) => void;
  /** 预加载失败回调 */
  onError?: (key: string, error: Error) => void;
}

/**
 * 使用预加载功能的 Hook
 *
 * @example
 * // 基础用法
 * const { preload, isPreloaded } = usePreload();
 *
 * useEffect(() => {
 *   preload('charts', () => import('recharts'), { delay: 1000 });
 * }, []);
 *
 * @example
 * // 批量预加载
 * const { preloadBatch } = usePreload({
 *   autoPreload: true,
 *   onPreloaded: (key) => console.log(`${key} loaded`),
 * });
 *
 * useEffect(() => {
 *   preloadBatch([
 *     { key: 'charts', loader: () => import('recharts'), strategy: 'delay', delay: 1000 },
 *     { key: 'swagger', loader: () => import('swagger-ui-react'), strategy: 'idle' },
 *   ]);
 * }, []);
 */
export function usePreload(options: UsePreloadOptions = {}) {
  const { autoPreload = false, onPreloaded, onError } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const listenersRef = useRef<Map<string, () => void>>(new Map());

  /**
   * 预加载单个模块
   */
  const preload = useCallback(
    (key: string, loader: () => Promise<unknown>, config: PreloadConfig = {}) => {
      if (preloadManager.isPreloaded(key)) {
        onPreloaded?.(key);
        return;
      }

      preloadManager.preload(key, loader, {
        ...config,
        // 包装回调以触发事件
        ...((onPreloaded || onError) && {
          delay: config.delay,
          idle: config.idle,
        }),
      });

      // 监听预加载结果
      loader()
        .then(() => onPreloaded?.(key))
        .catch((err) => onError?.(key, err));
    },
    [onPreloaded, onError],
  );

  /**
   * 批量预加载
   */
  const preloadBatch = useCallback(
    (items: PreloadItem[]) => {
      items.forEach((item) => {
        const {
          key,
          loader,
          strategy = 'immediate',
          delay,
          viewportSelector,
          interactionSelector,
          interactionEvent = 'mouseenter',
        } = item;

        switch (strategy) {
          case 'immediate':
            preload(key, loader);
            break;

          case 'delay':
            preload(key, loader, { delay: delay || 1000 });
            break;

          case 'idle':
            preload(key, loader, { idle: true });
            break;

          case 'viewport':
            if (viewportSelector && typeof document !== 'undefined') {
              const element = document.querySelector(viewportSelector);
              if (element) {
                observerRef.current = new IntersectionObserver(
                  (entries) => {
                    entries.forEach((entry) => {
                      if (entry.isIntersecting) {
                        preload(key, loader);
                        observerRef.current?.unobserve(entry.target);
                      }
                    });
                  },
                  { rootMargin: '100px' },
                );
                observerRef.current.observe(element);
              }
            }
            break;

          case 'interaction':
            if (interactionSelector && typeof document !== 'undefined') {
              const element = document.querySelector(interactionSelector);
              if (element) {
                const handler = () => {
                  preload(key, loader);
                  element.removeEventListener(interactionEvent, handler);
                  listenersRef.current.delete(key);
                };
                element.addEventListener(interactionEvent, handler);
                listenersRef.current.set(key, handler);
              }
            }
            break;
        }
      });
    },
    [preload],
  );

  /**
   * 检查模块是否已预加载
   */
  const isPreloaded = useCallback((key: string): boolean => {
    return preloadManager.isPreloaded(key);
  }, []);

  /**
   * 预加载常用库
   */
  const preloadLibraries = useCallback(() => {
    preloadCommonLibraries();
  }, []);

  /**
   * 清理所有监听器
   */
  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    listenersRef.current.forEach((handler, key) => {
      const element = document.querySelector(`[data-preload-key="${key}"]`);
      element?.removeEventListener('mouseenter', handler);
    });
    listenersRef.current.clear();
  }, []);

  // 自动预加载
  useEffect(() => {
    if (autoPreload) {
      preloadLibraries();
    }

    return cleanup;
  }, [autoPreload, preloadLibraries, cleanup]);

  return {
    preload,
    preloadBatch,
    isPreloaded,
    preloadLibraries,
    cleanup,
  };
}

/**
 * 使用组件预加载的 Hook
 * 当用户悬停在链接上时预加载组件
 */
export function useComponentPreload<T>(
  key: string,
  loader: () => Promise<T>,
  options: { delay?: number; onPreload?: () => void } = {},
) {
  const { delay = 100, onPreload } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (preloadManager.isPreloaded(key)) return;

    timeoutRef.current = setTimeout(() => {
      preloadManager.preload(key, loader, {
        delay: 0,
        idle: true,
      });
      onPreload?.();
    }, delay);
  }, [key, loader, delay, onPreload]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    preloadProps: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
    isPreloaded: () => preloadManager.isPreloaded(key),
  };
}
