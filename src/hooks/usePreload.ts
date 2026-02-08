'use client';

import { useEffect, useCallback, useRef } from 'react';

import { preloadManager, preloadCommonLibraries, type PreloadConfig } from '@/lib/dynamic-imports';

export type PreloadStrategy = 'immediate' | 'idle' | 'delay' | 'viewport' | 'interaction';

interface PreloadItem {
  key: string;
  loader: () => Promise<unknown>;
  strategy?: PreloadStrategy;
  delay?: number;
  viewportSelector?: string;
  interactionSelector?: string;
  interactionEvent?: 'mouseenter' | 'click' | 'focus';
}

interface UsePreloadOptions {
  autoPreload?: boolean;
  onPreloaded?: (key: string) => void;
  onError?: (key: string, error: Error) => void;
}

export function usePreload(options: UsePreloadOptions = {}) {
  const { autoPreload = false, onPreloaded, onError } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const listenersRef = useRef<Map<string, () => void>>(new Map());

  const preload = useCallback(
    (key: string, loader: () => Promise<unknown>, config: PreloadConfig = {}) => {
      if (preloadManager.isPreloaded(key)) {
        onPreloaded?.(key);
        return;
      }

      preloadManager.preload(key, loader, {
        ...config,
        ...((onPreloaded || onError) && {
          delay: config.delay,
          idle: config.idle,
        }),
      });

      loader()
        .then(() => onPreloaded?.(key))
        .catch((err) => onError?.(key, err));
    },
    [onPreloaded, onError],
  );

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

  const isPreloaded = useCallback((key: string): boolean => {
    return preloadManager.isPreloaded(key);
  }, []);

  const preloadLibraries = useCallback(() => {
    preloadCommonLibraries();
  }, []);

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
