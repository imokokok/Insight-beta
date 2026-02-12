/**
 * Refresh Indicator 组件
 *
 * 显示数据刷新状态和最后更新时间
 * 降低用户对"是不是卡住了"的疑惑
 */

'use client';

import { useEffect, useState } from 'react';

import { RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';

import { formatLastUpdated, type RefreshStrategyConfig } from '@/config/refreshStrategy';
import { cn } from '@/shared/utils';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface RefreshIndicatorProps {
  /** 最后更新时间 */
  lastUpdated: Date | null;
  /** 是否正在刷新 */
  isRefreshing?: boolean;
  /** 刷新策略配置 */
  strategy?: RefreshStrategyConfig;
  /** 是否使用 WebSocket */
  isWebSocketConnected?: boolean;
  /** 手动刷新回调 */
  onRefresh?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 紧凑模式 */
  compact?: boolean;
}

/**
 * 刷新状态指示器组件
 *
 * @example
 * // 基础用法
 * <RefreshIndicator
 *   lastUpdated={lastUpdated}
 *   isRefreshing={isLoading}
 *   strategy={REFRESH_STRATEGIES.standard}
 * />
 *
 * // 带 WebSocket 状态
 * <RefreshIndicator
 *   lastUpdated={lastUpdated}
 *   isRefreshing={isLoading}
 *   strategy={REFRESH_STRATEGIES.realtime}
 *   isWebSocketConnected={wsConnected}
 *   onRefresh={refetch}
 * />
 */
export function RefreshIndicator({
  lastUpdated,
  isRefreshing = false,
  strategy,
  isWebSocketConnected,
  onRefresh,
  className,
  compact = false,
}: RefreshIndicatorProps) {
  const [displayTime, setDisplayTime] = useState(() => formatLastUpdated(lastUpdated));

  // 每秒更新显示时间
  useEffect(() => {
    setDisplayTime(formatLastUpdated(lastUpdated));

    const interval = setInterval(() => {
      setDisplayTime(formatLastUpdated(lastUpdated));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  // 判断是否显示刷新指示器
  const showIndicator = strategy?.showIndicator ?? true;

  if (!showIndicator) {
    return null;
  }

  // WebSocket 状态图标
  const getConnectionIcon = () => {
    if (isWebSocketConnected === undefined) {
      return null;
    }
    return isWebSocketConnected ? (
      <Wifi className="h-3 w-3 text-green-500" aria-hidden="true" />
    ) : (
      <WifiOff className="h-3 w-3 text-red-400" aria-hidden="true" />
    );
  };

  const content = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-white px-2 py-1 text-xs text-gray-500 shadow-sm transition-all',
        isRefreshing && 'border-primary/20 bg-primary/5 text-primary',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy={isRefreshing}
    >
      {/* 刷新图标 */}
      {isRefreshing ? (
        <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : (
        <Clock className="h-3 w-3" aria-hidden="true" />
      )}

      {/* WebSocket 连接状态 */}
      {getConnectionIcon()}

      {/* 时间显示 */}
      <span className={cn('tabular-nums', compact && 'hidden sm:inline')}>
        {isRefreshing ? '更新中...' : displayTime}
      </span>

      {/* 刷新策略标签 */}
      {strategy?.indicatorText && !compact && (
        <span className="hidden border-l border-gray-200 pl-1.5 text-[10px] text-gray-400 sm:inline">
          {strategy.indicatorText}
        </span>
      )}

      {/* 手动刷新按钮 */}
      {onRefresh && !isRefreshing && (
        <button
          onClick={onRefresh}
          className="focus:ring-primary500 ml-1 rounded p-0.5 hover:bg-gray-100 focus:outline-none focus:ring-1"
          aria-label="立即刷新"
          title="立即刷新"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </div>
  );

  // 构建 tooltip 内容
  const tooltipContent = (
    <div className="space-y-1">
      <p className="font-medium">数据刷新状态</p>
      {strategy && (
        <p className="text-xs text-gray-400">
          策略: {strategy.label} - {strategy.description}
        </p>
      )}
      <p className="text-xs text-gray-400">
        最后更新: {lastUpdated?.toLocaleString('zh-CN') ?? '从未'}
      </p>
      {isWebSocketConnected !== undefined && (
        <p className="text-xs">WebSocket: {isWebSocketConnected ? '已连接' : '未连接'}</p>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
