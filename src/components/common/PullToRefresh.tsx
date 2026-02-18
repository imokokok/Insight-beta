'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

import { RefreshCw } from 'lucide-react';

import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  threshold?: number;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({
  onRefresh,
  disabled = false,
  threshold = 80,
  children,
  className,
}: PullToRefreshProps) {
  const { t } = useI18n();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      if (scrollTop > 0) return;

      startYRef.current = e.touches[0]?.clientY ?? 0;
      isPullingRef.current = true;
    },
    [disabled, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPullingRef.current || disabled || isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      if (scrollTop > 0) {
        isPullingRef.current = false;
        return;
      }

      const currentY = e.touches[0]?.clientY ?? 0;
      const diff = currentY - startYRef.current;

      if (diff > 0) {
        e.preventDefault();
        const distance = Math.min(diff * 0.5, threshold * 1.5);
        setPullDistance(distance);
      }
    },
    [disabled, isRefreshing, threshold],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || disabled) return;

    isPullingRef.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    if (isRefreshing) {
      setPullDistance(threshold);
    }
  }, [isRefreshing, threshold]);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 0 || isRefreshing;
  const canTrigger = pullDistance >= threshold;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{
        touchAction: 'pan-y',
        overscrollBehavior: 'contain',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={cn(
          'absolute left-1/2 z-50 flex flex-col items-center justify-center transition-all duration-200',
          showIndicator ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          top: pullDistance > 0 ? `${pullDistance - 40}px` : '-40px',
          transform: 'translateX(-50%)',
        }}
      >
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-lg transition-colors',
            canTrigger || isRefreshing ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <RefreshCw
            className={cn('h-5 w-5', isRefreshing && 'animate-spin')}
            style={{
              transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)`,
            }}
          />
        </div>
        <span className="mt-1 text-xs text-muted-foreground">
          {isRefreshing
            ? t('common.pullToRefresh.refreshing')
            : canTrigger
              ? t('common.pullToRefresh.release')
              : t('common.pullToRefresh.pull')}
        </span>
      </div>

      <div
        className={cn('transition-transform duration-200', isRefreshing && 'pointer-events-none')}
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
