'use client';

import { useEffect, useRef, useCallback } from 'react';

import { usePathname } from 'next/navigation';

import { logger } from '@/lib/logger';

/**
 * 智能预加载配置
 */
interface PreloadConfig {
  /** 路由匹配模式 */
  pattern: RegExp;
  /** 需要预加载的资源 */
  resources: {
    /** API 端点 */
    api?: string[];
    /** 图片资源 */
    images?: string[];
    /** 组件模块 */
    components?: (() => Promise<unknown>)[];
  };
  /** 延迟时间（毫秒） */
  delay?: number;
  /** 优先级 */
  priority?: 'high' | 'normal' | 'low';
}

/**
 * 预加载队列项
 */
interface PreloadQueueItem {
  id: string;
  url: string;
  type: 'api' | 'image' | 'component';
  priority: number;
  timestamp: number;
}

/**
 * 默认预加载配置
 */
const DEFAULT_PRELOAD_CONFIGS: PreloadConfig[] = [
  {
    pattern: /^\/$|^\/oracle$/,
    resources: {
      api: ['/api/comparison/realtime', '/api/metrics'],
    },
    delay: 2000,
    priority: 'high',
  },
  {
    pattern: /^\/oracle\/dashboard/,
    resources: {
      api: ['/api/monitoring/dashboard', '/api/comparison/heatmap'],
    },
    delay: 1500,
    priority: 'high',
  },
  {
    pattern: /^\/alerts/,
    resources: {
      api: ['/api/alerts', '/api/alerts/stats'],
    },
    delay: 1000,
    priority: 'normal',
  },
];

/**
 * 智能预加载组件
 *
 * 根据当前路由智能预加载相关资源
 * - API 数据预取
 * - 图片资源预加载
 * - 组件模块预加载
 */
export function SmartPreloader() {
  const pathname = usePathname();
  const preloadQueueRef = useRef<PreloadQueueItem[]>([]);
  const isProcessingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 添加预加载项到队列
   */
  const enqueuePreload = useCallback((items: Omit<PreloadQueueItem, 'timestamp'>[]) => {
    const now = Date.now();
    items.forEach((item) => {
      // 检查是否已存在
      const exists = preloadQueueRef.current.some(
        (q) => q.url === item.url && q.type === item.type,
      );
      if (!exists) {
        preloadQueueRef.current.push({
          ...item,
          timestamp: now,
        });
      }
    });

    // 按优先级排序
    preloadQueueRef.current.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });
  }, []);

  /**
   * 预加载 API
   */
  const preloadApi = useCallback(async (url: string, signal: AbortSignal) => {
    try {
      // 检查缓存
      const cacheKey = `preload-cache-${url}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        // 缓存5分钟内有效
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return;
        }
      }

      const response = await fetch(url, {
        method: 'GET',
        signal,
        headers: {
          'X-Preload': 'true',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // 存储到 sessionStorage
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          }),
        );
        logger.debug('API preloaded', { url });
      }
    } catch (error) {
      // 预加载失败不报错
      if ((error as Error).name !== 'AbortError') {
        logger.debug('API preload failed', { url, error });
      }
    }
  }, []);

  /**
   * 预加载图片
   */
  const preloadImage = useCallback((url: string) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        logger.debug('Image preloaded', { url });
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    });
  }, []);

  /**
   * 处理预加载队列
   */
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || preloadQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // 使用 requestIdleCallback 在空闲时处理
    const process = async () => {
      while (preloadQueueRef.current.length > 0 && !signal.aborted) {
        const item = preloadQueueRef.current.shift();
        if (!item) continue;

        try {
          switch (item.type) {
            case 'api':
              await preloadApi(item.url, signal);
              break;
            case 'image':
              await preloadImage(item.url);
              break;
            case 'component':
              // 动态导入组件
              await import(item.url);
              break;
          }
        } catch (error) {
          logger.debug('Preload item failed', { item, error });
        }

        // 每处理完一项，让出时间片
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      isProcessingRef.current = false;
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(
        () => {
          process();
        },
        { timeout: 2000 },
      );
    } else {
      setTimeout(process, 100);
    }
  }, [preloadApi, preloadImage]);

  /**
   * 根据路由匹配预加载配置
   */
  const matchPreloadConfig = useCallback((path: string): PreloadConfig | null => {
    return DEFAULT_PRELOAD_CONFIGS.find((config) => config.pattern.test(path)) || null;
  }, []);

  useEffect(() => {
    // 取消之前的预加载
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 清空队列
    preloadQueueRef.current = [];
    isProcessingRef.current = false;

    // 匹配当前路由的预加载配置
    const config = matchPreloadConfig(pathname);
    if (!config) return;

    // 延迟执行预加载
    const timer = setTimeout(() => {
      const items: Omit<PreloadQueueItem, 'timestamp'>[] = [];
      const priorityMap = { high: 3, normal: 2, low: 1 };
      const basePriority = priorityMap[config.priority || 'normal'];

      // 添加 API 预加载
      config.resources.api?.forEach((url, index) => {
        items.push({
          id: `api-${url}`,
          url,
          type: 'api',
          priority: basePriority * 10 + index,
        });
      });

      // 添加图片预加载
      config.resources.images?.forEach((url, index) => {
        items.push({
          id: `img-${url}`,
          url,
          type: 'image',
          priority: basePriority * 5 + index,
        });
      });

      // 添加组件预加载
      config.resources.components?.forEach((_, index) => {
        // 组件预加载在实际使用时处理
        items.push({
          id: `component-${index}`,
          url: '',
          type: 'component',
          priority: basePriority + index,
        });
      });

      if (items.length > 0) {
        enqueuePreload(items);
        processQueue();
      }
    }, config.delay || 2000);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [pathname, matchPreloadConfig, enqueuePreload, processQueue]);

  // 这个组件不渲染任何内容
  return null;
}

/**
 * 获取预加载的缓存数据
 */
export function getPreloadedData<T>(url: string): T | null {
  if (typeof window === 'undefined') return null;

  const cacheKey = `preload-cache-${url}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (!cached) return null;

  try {
    const { data, timestamp } = JSON.parse(cached);
    // 检查缓存是否过期（5分钟）
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

/**
 * 清除预加载缓存
 */
export function clearPreloadCache(): void {
  if (typeof window === 'undefined') return;

  Object.keys(sessionStorage).forEach((key) => {
    if (key.startsWith('preload-cache-')) {
      sessionStorage.removeItem(key);
    }
  });
}

export default SmartPreloader;
