/**
 * Performance Monitor Hook - 性能监控 Hook
 *
 * 用于监控组件渲染性能和检测慢渲染
 * - 渲染次数统计
 * - 渲染时间测量
 * - 慢渲染警告
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface PerformanceMetrics {
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  lastRenderTimestamp: number;
  slowRenders: number;
}

interface UsePerformanceMonitorOptions {
  /** 慢渲染阈值（毫秒） */
  slowRenderThreshold?: number;
  /** 是否启用日志 */
  enableLogging?: boolean;
  /** 日志级别 */
  logLevel?: 'debug' | 'warn' | 'error';
}

/**
 * 组件性能监控 Hook
 */
export function usePerformanceMonitor(
  componentName: string,
  options: UsePerformanceMonitorOptions = {},
): PerformanceMetrics {
  const {
    slowRenderThreshold = 16, // 默认 16ms（一帧时间）
    enableLogging = process.env.NODE_ENV === 'development',
    logLevel = 'warn',
  } = options;

  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    totalRenderTime: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    lastRenderTimestamp: 0,
    slowRenders: 0,
  });

  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTimeRef.current;

    const metrics = metricsRef.current;
    metrics.renderCount++;
    metrics.lastRenderTime = renderTime;
    metrics.totalRenderTime += renderTime;
    metrics.averageRenderTime = metrics.totalRenderTime / metrics.renderCount;
    metrics.lastRenderTimestamp = endTime;

    // 检测慢渲染
    if (renderTime > slowRenderThreshold) {
      metrics.slowRenders++;

      if (enableLogging) {
        const logData = {
          component: componentName,
          renderTime: `${renderTime.toFixed(2)}ms`,
          renderCount: metrics.renderCount,
          slowRenders: metrics.slowRenders,
          averageRenderTime: `${metrics.averageRenderTime.toFixed(2)}ms`,
        };

        if (logLevel === 'error' && renderTime > slowRenderThreshold * 2) {
          logger.error(`Very slow render detected in ${componentName}`, logData);
        } else if (logLevel === 'warn') {
          logger.warn(`Slow render detected in ${componentName}`, logData);
        } else {
          logger.debug(`Render metrics for ${componentName}`, logData);
        }
      }
    }

    // 重置开始时间
    startTimeRef.current = performance.now();
  });

  return metricsRef.current;
}

/**
 * 高阶组件：自动添加性能监控
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
  options?: UsePerformanceMonitorOptions,
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props: P) => {
    usePerformanceMonitor(componentName, options);
    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `PerformanceTracked(${componentName})`;

  return WrappedComponent;
}

/**
 * 使用 React Profiler API 监控渲染性能
 */
export function useProfiler(
  _id: string,
  onRender?: (metrics: {
    id: string;
    phase: 'mount' | 'update';
    actualDuration: number;
    baseDuration: number;
    startTime: number;
    commitTime: number;
  }) => void,
): (
  profilerId: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
) => void {
  const onRenderCallback = useCallback(
    (
      profilerId: string,
      phase: 'mount' | 'update',
      actualDuration: number,
      baseDuration: number,
      startTime: number,
      commitTime: number,
    ) => {
      // 慢渲染检测
      if (actualDuration > 16) {
        logger.warn('Slow component render detected', {
          component: profilerId,
          phase,
          actualDuration: `${actualDuration.toFixed(2)}ms`,
          baseDuration: `${baseDuration.toFixed(2)}ms`,
        });
      }

      // 调用自定义回调
      onRender?.({
        id: profilerId,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
      });
    },
    [onRender],
  );

  return onRenderCallback;
}

/**
 * 长任务检测 Hook
 */
export function useLongTaskDetector(threshold: number = 50): void {
  useEffect(() => {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > threshold) {
            logger.warn('Long task detected', {
              duration: entry.duration,
              startTime: entry.startTime,
              threshold,
            });
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });

      return () => {
        observer.disconnect();
      };
    } catch (error) {
      logger.debug('Long tasks monitoring not supported', { error });
    }
    return undefined;
  }, [threshold]);
}

/**
 * 内存使用监控 Hook
 */
export function useMemoryMonitor(componentName: string, intervalMs: number = 30000): void {
  useEffect(() => {
    if (!('memory' in performance)) {
      return;
    }

    const checkMemory = () => {
      const memory = (
        performance as unknown as {
          memory: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
            jsHeapSizeLimit: number;
          };
        }
      ).memory;

      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const totalMB = memory.totalJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      const usagePercent = (usedMB / limitMB) * 100;

      if (usagePercent > 80) {
        logger.warn(`High memory usage in ${componentName}`, {
          usedMB: `${usedMB.toFixed(2)}MB`,
          totalMB: `${totalMB.toFixed(2)}MB`,
          limitMB: `${limitMB.toFixed(2)}MB`,
          usagePercent: `${usagePercent.toFixed(2)}%`,
        });
      }
    };

    const interval = setInterval(checkMemory, intervalMs);
    return () => clearInterval(interval);
  }, [componentName, intervalMs]);
}

const performanceHooks = {
  usePerformanceMonitor,
  withPerformanceTracking,
  useProfiler,
  useLongTaskDetector,
  useMemoryMonitor,
};

export default performanceHooks;
