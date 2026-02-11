'use client';

import React, { useRef, useState } from 'react';

import { useSwipe, useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

interface MobileChartWrapperProps {
  children: React.ReactNode;
  className?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enableSwipe?: boolean;
}

/**
 * 移动端图表包装组件
 * 提供触摸滑动支持和手势交互
 */
export function MobileChartWrapper({
  children,
  className,
  onSwipeLeft,
  onSwipeRight,
  enableSwipe = true,
}: MobileChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [isDragging, setIsDragging] = useState(false);

  // 启用滑动手势
  useSwipe(containerRef, {
    onSwipeLeft: enableSwipe ? onSwipeLeft : undefined,
    onSwipeRight: enableSwipe ? onSwipeRight : undefined,
    threshold: 50,
  });

  // 处理触摸事件以支持图表缩放
  const handleTouchStart = () => {
    setIsDragging(true);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative touch-pan-y overflow-hidden rounded-xl',
        isDragging && 'cursor-grabbing',
        isMobile && 'select-none',
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      
      {/* 移动端滑动提示 */}
      {isMobile && enableSwipe && (onSwipeLeft || onSwipeRight) && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-center bg-gradient-to-l from-white/50 to-transparent opacity-0 transition-opacity hover:opacity-100">
          <svg
            className="h-6 w-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * 移动端图表工具栏
 */
interface MobileChartToolbarProps {
  title?: string;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  onPeriodChange?: (period: string) => void;
  periods?: { value: string; label: string }[];
  activePeriod?: string;
  className?: string;
}

export function MobileChartToolbar({
  title,
  onZoomIn,
  onZoomOut,
  onReset,
  onPeriodChange,
  periods = [
    { value: '1h', label: '1H' },
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
  ],
  activePeriod = '24h',
  className,
}: MobileChartToolbarProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      {title && (
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      )}

      <div className="flex items-center gap-2">
        {/* 时间周期选择 */}
        {onPeriodChange && (
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {periods.map((period) => (
              <button
                key={period.value}
                onClick={() => onPeriodChange(period.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                  activePeriod === period.value
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        )}

        {/* 缩放控制 - 桌面端显示 */}
        {!isMobile && (onZoomIn || onZoomOut || onReset) && (
          <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
            {onZoomIn && (
              <button
                onClick={onZoomIn}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                title="放大"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            )}
            {onZoomOut && (
              <button
                onClick={onZoomOut}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                title="缩小"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            )}
            {onReset && (
              <button
                onClick={onReset}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                title="重置"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 移动端图表卡片
 */
interface MobileChartCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  fullWidth?: boolean;
}

export function MobileChartCard({
  children,
  title,
  subtitle,
  action,
  className,
  headerClassName,
  bodyClassName,
  fullWidth = false,
}: MobileChartCardProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm',
        fullWidth && 'mx-[-12px] rounded-none border-x-0 sm:mx-0 sm:rounded-xl sm:border-x',
        className
      )}
    >
      {(title || subtitle || action) && (
        <div
          className={cn(
            'flex items-start justify-between border-b border-gray-100 p-4',
            headerClassName
          )}
        >
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="truncate text-base font-semibold text-gray-800">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          {action && <div className="ml-2 flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </div>
  );
}

/**
 * 移动端图表图例
 */
interface MobileLegendProps {
  items: {
    color: string;
    label: string;
    value?: string;
    trend?: 'up' | 'down' | 'neutral';
  }[];
  className?: string;
  onItemClick?: (index: number) => void;
}

export function MobileLegend({
  items,
  className,
  onItemClick,
}: MobileLegendProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-3 sm:gap-4',
        className
      )}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => onItemClick?.(index)}
          className={cn(
            'flex items-center gap-2 rounded-lg px-2 py-1 transition-colors',
            onItemClick && 'hover:bg-gray-50'
          )}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-gray-600">{item.label}</span>
          {item.value && (
            <span className="text-xs font-medium text-gray-800">
              {item.value}
            </span>
          )}
          {item.trend && (
            <span
              className={cn(
                'text-xs',
                item.trend === 'up' && 'text-green-500',
                item.trend === 'down' && 'text-red-500',
                item.trend === 'neutral' && 'text-gray-400'
              )}
            >
              {item.trend === 'up' && '↑'}
              {item.trend === 'down' && '↓'}
              {item.trend === 'neutral' && '→'}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
