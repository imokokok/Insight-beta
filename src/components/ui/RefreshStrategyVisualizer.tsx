/**
 * Refresh Strategy Visualizer
 *
 * 数据刷新策略可视化组件
 * - 显示刷新策略详情
 * - 下次刷新倒计时
 * - 刷新历史记录
 * - 刷新统计信息
 */

'use client';

import { useState, useEffect, useMemo } from 'react';

import {
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  TrendingDown,
  Settings,
  ChevronDown,
  ChevronUp,
  Activity,
  Timer,
  BarChart3,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  type RefreshStrategyConfig,
  type RefreshHistoryItem,
  type RefreshStats,
  formatLastUpdated,
  formatDuration,
  formatCountdown,
  REFRESH_STRATEGIES,
} from '@/config/refreshStrategy';
import { cn } from '@/shared/utils';

interface RefreshStrategyVisualizerProps {
  strategy: RefreshStrategyConfig;
  lastUpdated: Date | null;
  isRefreshing?: boolean;
  isWebSocketConnected?: boolean;
  onRefresh?: () => void;
  onStrategyChange?: (strategyId: string) => void;
  refreshHistory?: RefreshHistoryItem[];
  refreshStats?: RefreshStats;
  showHistory?: boolean;
  showStats?: boolean;
  showStrategySelector?: boolean;
  compact?: boolean;
  className?: string;
}

export function RefreshStrategyVisualizer({
  strategy,
  lastUpdated,
  isRefreshing = false,
  isWebSocketConnected,
  onRefresh,
  onStrategyChange,
  refreshHistory = [],
  refreshStats,
  showHistory = true,
  showStats = true,
  showStrategySelector = false,
  compact = false,
  className,
}: RefreshStrategyVisualizerProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (strategy.interval === 0 || isRefreshing) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      if (!lastUpdated) {
        setCountdown(strategy.interval / 1000);
        return;
      }

      const elapsed = Date.now() - lastUpdated.getTime();
      const remaining = Math.max(0, Math.floor((strategy.interval - elapsed) / 1000));
      setCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [strategy.interval, lastUpdated, isRefreshing]);

  const progress = useMemo(() => {
    if (strategy.interval === 0) return 100;
    return Math.max(
      0,
      Math.min(100, ((strategy.interval / 1000 - countdown) / (strategy.interval / 1000)) * 100),
    );
  }, [strategy.interval, countdown]);

  const getConnectionStatus = () => {
    if (isWebSocketConnected === undefined) return null;

    return isWebSocketConnected ? (
      <div className="flex items-center gap-1 text-green-600">
        <Wifi className="h-3.5 w-3.5" />
        <span className="text-xs">已连接</span>
      </div>
    ) : (
      <div className="flex items-center gap-1 text-red-500">
        <WifiOff className="h-3.5 w-3.5" />
        <span className="text-xs">未连接</span>
      </div>
    );
  };

  const getStrategyIcon = () => {
    switch (strategy.id) {
      case 'realtime':
        return <Activity className="h-4 w-4 text-green-500" />;
      case 'frequent':
        return <Timer className="h-4 w-4 text-blue-500" />;
      case 'standard':
        return <Clock className="h-4 w-4 text-primary" />;
      case 'lazy':
        return <TrendingDown className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-xs shadow-sm">
                {isRefreshing ? (
                  <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                ) : (
                  getStrategyIcon()
                )}
                <span className="text-gray-600">{formatLastUpdated(lastUpdated)}</span>
                {strategy.interval > 0 && !isRefreshing && (
                  <span className="text-gray-400">• {formatCountdown(countdown)}</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <RefreshStrategyTooltip
                strategy={strategy}
                lastUpdated={lastUpdated}
                isRefreshing={isRefreshing}
                isWebSocketConnected={isWebSocketConnected}
                countdown={countdown}
                refreshStats={refreshStats}
              />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            {getStrategyIcon()}
            <span>数据刷新策略</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {getConnectionStatus()}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 p-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'font-medium',
                    strategy.id === 'realtime' && 'border-green-200 bg-green-50 text-green-700',
                    strategy.id === 'frequent' && 'border-blue-200 bg-blue-50 text-blue-700',
                    strategy.id === 'standard' &&
                      'text-primary-dark border-primary/20 bg-primary/5',
                    strategy.id === 'lazy' && 'border-amber-200 bg-amber-50 text-amber-700',
                  )}
                >
                  {strategy.label}
                </Badge>
                <span className="text-xs text-gray-500">{strategy.description}</span>
              </div>
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="h-7"
                >
                  <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                  {isRefreshing ? '刷新中...' : '立即刷新'}
                </Button>
              )}
            </div>

            {strategy.interval > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">下次刷新倒计时</span>
                  <span className="font-mono font-medium text-primary">
                    {formatCountdown(countdown)}
                  </span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border bg-white p-2.5">
                <div className="text-gray-500">最后更新</div>
                <div className="mt-1 font-medium text-gray-900">
                  {formatLastUpdated(lastUpdated)}
                </div>
              </div>
              <div className="rounded-lg border bg-white p-2.5">
                <div className="text-gray-500">刷新间隔</div>
                <div className="mt-1 font-medium text-gray-900">
                  {strategy.interval > 0 ? formatDuration(strategy.interval) : '实时'}
                </div>
              </div>
            </div>
          </div>

          {showStats && refreshStats && <RefreshStatsView stats={refreshStats} />}

          {showHistory && refreshHistory.length > 0 && (
            <RefreshHistoryView history={refreshHistory} />
          )}

          {showStrategySelector && onStrategyChange && (
            <RefreshStrategySelector
              currentStrategy={strategy.id}
              onStrategyChange={onStrategyChange}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}

interface RefreshStrategyTooltipProps {
  strategy: RefreshStrategyConfig;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  isWebSocketConnected?: boolean;
  countdown: number;
  refreshStats?: RefreshStats;
}

function RefreshStrategyTooltip({
  strategy,
  lastUpdated,
  isRefreshing,
  isWebSocketConnected,
  countdown,
  refreshStats,
}: RefreshStrategyTooltipProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {strategy.label}
        </Badge>
        {isRefreshing && <span className="text-xs text-primary">刷新中...</span>}
      </div>

      <div className="space-y-1 text-xs text-gray-400">
        <p>{strategy.description}</p>
        <p>最后更新: {formatLastUpdated(lastUpdated)}</p>
        {strategy.interval > 0 && !isRefreshing && <p>下次刷新: {formatCountdown(countdown)}</p>}
        {isWebSocketConnected !== undefined && (
          <p>WebSocket: {isWebSocketConnected ? '已连接' : '未连接'}</p>
        )}
      </div>

      {refreshStats && (
        <div className="border-t pt-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">成功率</span>
            <span className="font-medium">
              {refreshStats.totalRefreshes > 0
                ? `${((refreshStats.successfulRefreshes / refreshStats.totalRefreshes) * 100).toFixed(0)}%`
                : 'N/A'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface RefreshStatsViewProps {
  stats: RefreshStats;
}

function RefreshStatsView({ stats }: RefreshStatsViewProps) {
  const successRate =
    stats.totalRefreshes > 0
      ? ((stats.successfulRefreshes / stats.totalRefreshes) * 100).toFixed(0)
      : '0';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
        <BarChart3 className="h-3.5 w-3.5" />
        <span>刷新统计</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-gray-50 p-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>成功</span>
          </div>
          <div className="mt-0.5 text-lg font-bold text-green-600">{stats.successfulRefreshes}</div>
        </div>

        <div className="rounded-lg border bg-gray-50 p-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <XCircle className="h-3 w-3 text-red-500" />
            <span>失败</span>
          </div>
          <div className="mt-0.5 text-lg font-bold text-red-600">{stats.failedRefreshes}</div>
        </div>

        <div className="rounded-lg border bg-gray-50 p-2">
          <div className="text-xs text-gray-500">成功率</div>
          <div className="mt-0.5 text-lg font-bold text-primary">{successRate}%</div>
        </div>

        <div className="rounded-lg border bg-gray-50 p-2">
          <div className="text-xs text-gray-500">平均耗时</div>
          <div className="mt-0.5 text-lg font-bold text-gray-900">
            {formatDuration(stats.averageDuration)}
          </div>
        </div>
      </div>

      {stats.lastError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2">
          <div className="text-xs font-medium text-red-700">最近错误</div>
          <div className="mt-1 text-xs text-red-600">{stats.lastErrorMessage || '未知错误'}</div>
          <div className="mt-1 text-xs text-red-400">{formatLastUpdated(stats.lastError)}</div>
        </div>
      )}
    </div>
  );
}

interface RefreshHistoryViewProps {
  history: RefreshHistoryItem[];
}

function RefreshHistoryView({ history }: RefreshHistoryViewProps) {
  const recentHistory = history.slice(-10).reverse();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
        <Activity className="h-3.5 w-3.5" />
        <span>刷新历史</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          最近 {recentHistory.length} 次
        </Badge>
      </div>

      <ScrollArea className="h-32 rounded-lg border">
        <div className="space-y-1 p-2">
          {recentHistory.map((item, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center justify-between rounded px-2 py-1 text-xs',
                item.success ? 'bg-green-50' : 'bg-red-50',
              )}
            >
              <div className="flex items-center gap-2">
                {item.success ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                <span className="text-gray-600">{item.timestamp.toLocaleTimeString('zh-CN')}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span>{formatDuration(item.duration)}</span>
                {!item.success && item.error && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="max-w-[100px] truncate text-red-500">{item.error}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">{item.error}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface RefreshStrategySelectorProps {
  currentStrategy: string;
  onStrategyChange: (strategyId: string) => void;
}

function RefreshStrategySelector({
  currentStrategy,
  onStrategyChange,
}: RefreshStrategySelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
        <Settings className="h-3.5 w-3.5" />
        <span>切换策略</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Object.values(REFRESH_STRATEGIES).map((s) => (
          <button
            key={s.id}
            onClick={() => onStrategyChange(s.id)}
            className={cn(
              'rounded-lg border p-2 text-left text-xs transition-all',
              currentStrategy === s.id
                ? 'text-primary-dark border-purple-300 bg-primary/5'
                : 'border-gray-200 bg-white text-gray-600 hover:border-primary/20 hover:bg-primary/5',
            )}
          >
            <div className="font-medium">{s.label}</div>
            <div className="mt-0.5 text-[10px] text-gray-400">{s.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default RefreshStrategyVisualizer;
