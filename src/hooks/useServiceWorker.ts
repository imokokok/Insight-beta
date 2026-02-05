/**
 * Service Worker 注册和管理 Hook
 *
 * 提供 PWA 功能支持：
 * - Service Worker 注册
 * - 更新检测
 * - 离线状态监控
 * - 缓存管理
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdating: boolean;
  hasUpdate: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
}

interface UseServiceWorkerReturn extends ServiceWorkerState {
  update: () => Promise<void>;
  skipWaiting: () => Promise<void>;
  unregister: () => Promise<void>;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isUpdating: false,
    hasUpdate: false,
    isOffline: false,
    registration: null,
  });

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // 检查浏览器支持
  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator;
    setState((prev) => ({ ...prev, isSupported }));
  }, []);

  // 注册 Service Worker
  useEffect(() => {
    if (!state.isSupported) return;

    let isMounted = true;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'imports',
        });

        if (!isMounted) return;

        registrationRef.current = registration;
        setState((prev) => ({ ...prev, registration, isRegistered: true }));

        logger.info('Service Worker registered', {
          scope: registration.scope,
          state: registration.installing?.state || registration.active?.state,
        });

        // 监听更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState((prev) => ({ ...prev, hasUpdate: true }));
              logger.info('Service Worker update available');
            }
          });
        });

        // 检查现有更新
        if (registration.waiting) {
          setState((prev) => ({ ...prev, hasUpdate: true }));
        }
      } catch (error) {
        logger.error('Service Worker registration failed', { error });
      }
    };

    registerSW();

    return () => {
      isMounted = false;
    };
  }, [state.isSupported]);

  // 监控网络状态
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOffline: false }));
      logger.info('App is online');
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOffline: true }));
      logger.info('App is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初始状态
    setState((prev) => ({ ...prev, isOffline: !navigator.onLine }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 手动检查更新
  const update = useCallback(async () => {
    if (!registrationRef.current) return;

    setState((prev) => ({ ...prev, isUpdating: true }));

    try {
      await registrationRef.current.update();
      logger.info('Service Worker update check completed');
    } catch (error) {
      logger.error('Service Worker update check failed', { error });
    } finally {
      setState((prev) => ({ ...prev, isUpdating: false }));
    }
  }, []);

  // 跳过等待，立即激活新版本
  const skipWaiting = useCallback(async () => {
    if (!registrationRef.current?.waiting) return;

    try {
      registrationRef.current.waiting.postMessage('skipWaiting');
      setState((prev) => ({ ...prev, hasUpdate: false }));
      logger.info('Service Worker skip waiting');
    } catch (error) {
      logger.error('Service Worker skip waiting failed', { error });
    }
  }, []);

  // 注销 Service Worker
  const unregister = useCallback(async () => {
    if (!registrationRef.current) return;

    try {
      await registrationRef.current.unregister();
      setState((prev) => ({
        ...prev,
        isRegistered: false,
        registration: null,
        hasUpdate: false,
      }));
      logger.info('Service Worker unregistered');
    } catch (error) {
      logger.error('Service Worker unregister failed', { error });
    }
  }, []);

  return {
    ...state,
    update,
    skipWaiting,
    unregister,
  };
}

/**
 * 预加载关键资源
 */
export function preloadCriticalResources(): void {
  if (typeof window === 'undefined') return;

  const criticalResources = [
    // 预加载关键字体
    { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
    // 预加载关键 API
    { href: '/api/oracle/stats', as: 'fetch' },
  ];

  criticalResources.forEach((resource) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource.href;
    link.as = resource.as;
    if (resource.type) link.type = resource.type;
    if (resource.crossOrigin) link.crossOrigin = resource.crossOrigin;
    document.head.appendChild(link);
  });

  logger.info('Critical resources preloaded');
}

/**
 * 预获取下一页资源
 */
export function prefetchRoute(route: string): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = route;
  document.head.appendChild(link);

  logger.debug('Route prefetched', { route });
}

/**
 * 检查缓存状态
 */
export async function getCacheStatus(): Promise<{
  static: number;
  dynamic: number;
  images: number;
  total: number;
}> {
  if (!('caches' in window)) {
    return { static: 0, dynamic: 0, images: 0, total: 0 };
  }

  const cacheNames = await caches.keys();
  let staticCount = 0;
  let dynamicCount = 0;
  let imageCount = 0;

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    const count = keys.length;

    if (name.includes('static')) staticCount += count;
    else if (name.includes('dynamic')) dynamicCount += count;
    else if (name.includes('image')) imageCount += count;
  }

  return {
    static: staticCount,
    dynamic: dynamicCount,
    images: imageCount,
    total: staticCount + dynamicCount + imageCount,
  };
}
