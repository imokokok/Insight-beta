'use client';

import { useEffect, useState } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import { cn } from '@/shared/utils';

/**
 * 页面加载进度条组件
 *
 * 在页面导航时显示顶部进度条，提升用户体验
 */
export function PageProgress() {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let progressTimer: ReturnType<typeof setInterval> | null = null;
    let completeTimer: ReturnType<typeof setTimeout> | null = null;

    // 开始加载
    setIsLoading(true);
    setProgress(0);

    // 模拟进度增长
    const simulateProgress = () => {
      setProgress((prev) => {
        if (prev < 30) return prev + 10;
        if (prev < 60) return prev + 5;
        if (prev < 80) return prev + 2;
        return prev;
      });
    };

    progressTimer = setInterval(simulateProgress, 100);

    // 完成加载
    completeTimer = setTimeout(() => {
      if (progressTimer) {
        clearInterval(progressTimer);
      }
      setProgress(100);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 300);
    }, 500);

    return () => {
      if (progressTimer) {
        clearInterval(progressTimer);
      }
      if (completeTimer) {
        clearTimeout(completeTimer);
      }
    };
  }, [pathname, searchParams]);

  if (!isLoading) return null;

  return (
    <div
      className={cn(
        'fixed left-0 right-0 top-0 z-[9999] h-0.5',
        'bg-gradient-to-r from-primary via-primary-400 to-primary',
        'transition-all duration-300 ease-out',
      )}
      style={{
        width: `${progress}%`,
        opacity: progress === 100 ? 0 : 1,
        boxShadow: '0 0 10px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.3)',
      }}
      aria-hidden="true"
    />
  );
}

export default PageProgress;
