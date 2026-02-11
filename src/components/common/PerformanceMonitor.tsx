'use client';

import { useEffect } from 'react';

import { useWebVitals, useLongTaskMonitor } from '@/hooks/usePerformance';

/**
 * 性能监控组件
 * 自动初始化 Web Vitals 和长任务监控
 */
export function PerformanceMonitor() {
  // 初始化 Web Vitals 监控
  useWebVitals();

  // 监控长任务
  useLongTaskMonitor((duration) => {
    // 可以在这里发送长任务警告到分析服务
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Performance] Long task: ${duration.toFixed(2)}ms`);
    }
  });

  // 监控页面可见性变化
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时，可以暂停某些性能密集型任务
        document.body.classList.add('page-hidden');
      } else {
        document.body.classList.remove('page-hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 这个组件不渲染任何内容
  return null;
}
