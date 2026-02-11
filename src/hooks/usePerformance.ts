/**
 * 性能监控 Hook
 * 用于在组件中监控性能和懒加载
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { initWebVitalsMonitoring, useComponentPerformance } from '@/lib/performance/monitor';

/**
 * 初始化 Web Vitals 监控
 */
export function useWebVitals() {
  useEffect(() => {
    initWebVitalsMonitoring();
  }, []);
}

/**
 * 组件渲染性能监控
 */
export function useRenderPerformance(componentName: string) {
  const perf = useRef(useComponentPerformance(componentName));

  useEffect(() => {
    return () => {
      perf.current.end();
    };
  }, []);
}

/**
 * Intersection Observer Hook - 用于懒加载
 */
interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const { threshold = 0, rootMargin = '0px', triggerOnce = false } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (triggerOnce && hasTriggered) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const intersecting = entry.isIntersecting;
        setIsIntersecting(intersecting);

        if (intersecting && triggerOnce) {
          setHasTriggered(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, hasTriggered]);

  return { ref: elementRef, isIntersecting, hasTriggered };
}

/**
 * 防抖 Hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 节流 Hook
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const remaining = delay - (now - lastCall.current);

      if (remaining <= 0) {
        lastCall.current = now;
        callback(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now();
          timeoutRef.current = null;
          callback(...args);
        }, remaining);
      }
    },
    [callback, delay]
  ) as T;
}

/**
 * RAF (Request Animation Frame) Hook - 用于平滑动画
 */
export function useRAF(callback: (deltaTime: number) => void) {
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current !== null) {
        const deltaTime = time - previousTimeRef.current;
        callback(deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [callback]);
}

/**
 * 测量资源加载时间
 */
export function useResourceTiming(url: string) {
  const [timing, setTiming] = useState<{
    duration: number | null;
    loadTime: number | null;
    size: number | null;
  }>({
    duration: null,
    loadTime: null,
    size: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkResource = () => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const resource = resources.find(r => r.name.includes(url));

      if (resource) {
        setTiming({
          duration: resource.duration,
          loadTime: resource.responseEnd - resource.startTime,
          size: resource.transferSize || null,
        });
      }
    };

    // 立即检查
    checkResource();

    // 延迟再次检查（确保资源已加载）
    const timeout = setTimeout(checkResource, 1000);

    return () => clearTimeout(timeout);
  }, [url]);

  return timing;
}

/**
 * 网络状态 Hook
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [effectiveType, setEffectiveType] = useState<string>('4g');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 获取网络连接信息
    const connection = (navigator as any).connection;
    if (connection) {
      setConnectionType(connection.type || 'unknown');
      setEffectiveType(connection.effectiveType || '4g');

      const handleConnectionChange = () => {
        setConnectionType(connection.type || 'unknown');
        setEffectiveType(connection.effectiveType || '4g');
      };

      connection.addEventListener('change', handleConnectionChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    connectionType,
    effectiveType,
    isSlowConnection: effectiveType === '2g' || effectiveType === 'slow-2g',
  };
}

/**
 * 内存使用监控 Hook
 */
export function useMemoryStatus() {
  const [memory, setMemory] = useState<{
    usedJSHeapSize: number | null;
    totalJSHeapSize: number | null;
    jsHeapSizeLimit: number | null;
  }>({
    usedJSHeapSize: null,
    totalJSHeapSize: null,
    jsHeapSizeLimit: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const memory = (performance as any).memory;
    if (!memory) return;

    const updateMemory = () => {
      setMemory({
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      });
    };

    updateMemory();
    const interval = setInterval(updateMemory, 5000);

    return () => clearInterval(interval);
  }, []);

  return memory;
}

/**
 * 长任务监控 Hook
 */
export function useLongTaskMonitor(callback?: (duration: number) => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const duration = (entry as any).duration;
          if (duration > 50) {
            // 超过 50ms 认为是长任务
            console.warn(`[Performance] Long task detected: ${duration.toFixed(2)}ms`);
            callback?.(duration);
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] });

      return () => observer.disconnect();
    } catch (e) {
      // 浏览器不支持 longtask
    }
  }, [callback]);
}
