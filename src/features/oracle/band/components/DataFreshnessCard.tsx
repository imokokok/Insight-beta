'use client';

import { useState, useEffect, useCallback } from 'react';

import { Clock, AlertTriangle, RefreshCw, CheckCircle2, XCircle, Activity } from 'lucide-react';

import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/shared/utils';

export interface FreshnessData {
  healthy: boolean;
  status: 'healthy' | 'warning' | 'critical';
  lastUpdate: string;
  lastUpdateTimestamp: number;
  stalenessSeconds: number;
  issues: string[];
  latencyDistribution: {
    under1min: boolean;
    under5min: boolean;
    under10min: boolean;
    over10min: boolean;
  };
}

interface DataFreshnessCardProps {
  symbol?: string;
  chain?: string;
  className?: string;
}

const getStatusColor = (status: FreshnessData['status']): string => {
  switch (status) {
    case 'healthy':
      return 'text-emerald-500';
    case 'warning':
      return 'text-amber-500';
    case 'critical':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

const getStatusBgColor = (status: FreshnessData['status']): string => {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-500';
    case 'warning':
      return 'bg-amber-500';
    case 'critical':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

const formatRelativeTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}秒前`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分钟前`;
  }
  const hours = Math.floor(seconds / 3600);
  const remainingMinutes = Math.floor((seconds % 3600) / 60);
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟前` : `${hours}小时前`;
  }
  const days = Math.floor(hours / 24);
  return `${days}天前`;
};

const formatExactTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export function DataFreshnessCard({
  symbol = 'ETH/USD',
  chain,
  className,
}: DataFreshnessCardProps) {
  const [data, setData] = useState<FreshnessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('symbol', symbol);
      if (chain) params.append('chain', chain);

      const response = await fetch(`/api/oracle/band/freshness?${params.toString()}`);
      if (!response.ok) {
        throw new Error('获取数据新鲜度失败');
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol, chain]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            数据新鲜度监控
          </CardTitle>
          <CardDescription>数据更新时间与健康状态</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            数据新鲜度监控
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">加载失败</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            数据新鲜度监控
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">暂无新鲜度数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latencyProgress = Math.min((data.stalenessSeconds / 600) * 100, 100);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              数据新鲜度监控
            </CardTitle>
            <CardDescription>数据更新时间与健康状态 - {symbol}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge
              status={
                data.status === 'healthy'
                  ? 'active'
                  : data.status === 'warning'
                    ? 'warning'
                    : 'error'
              }
              text={
                data.status === 'healthy' ? '健康' : data.status === 'warning' ? '警告' : '严重'
              }
              size="sm"
              pulse={data.status === 'healthy'}
            />
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted/30 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              最后更新时间
            </div>
            <p className="mt-1 text-lg font-semibold">
              {formatRelativeTime(data.stalenessSeconds)}
            </p>
            <p className="text-xs text-muted-foreground">{formatExactTime(data.lastUpdate)}</p>
          </div>

          <div className="rounded-lg bg-muted/30 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              延迟时间
            </div>
            <p className={cn('mt-1 text-lg font-semibold', getStatusColor(data.status))}>
              {data.stalenessSeconds}s
            </p>
            <p className="text-xs text-muted-foreground">阈值: 300s</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">更新延迟分布</span>
            <span className={cn('text-sm font-semibold', getStatusColor(data.status))}>
              {data.stalenessSeconds < 60
                ? '新鲜'
                : data.stalenessSeconds < 300
                  ? '正常'
                  : data.stalenessSeconds < 600
                    ? '陈旧'
                    : '过期'}
            </span>
          </div>

          <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full transition-all duration-500', getStatusBgColor(data.status))}
              style={{ width: `${latencyProgress}%` }}
            />
            <div className="absolute inset-0 flex items-center">
              <div className="h-full w-px bg-border" style={{ left: '50%' }} title="5分钟阈值" />
              <div className="h-full w-px bg-border" style={{ left: '100%' }} title="10分钟阈值" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0s</span>
            <span>5min</span>
            <span>10min+</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div
            className={cn(
              'flex flex-col items-center rounded-lg p-2 text-center',
              data.latencyDistribution.under1min
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-muted/30',
            )}
          >
            <CheckCircle2
              className={cn(
                'h-4 w-4',
                data.latencyDistribution.under1min ? 'text-emerald-500' : 'text-muted-foreground',
              )}
            />
            <span className="mt-1 text-xs">{'<1分钟'}</span>
          </div>
          <div
            className={cn(
              'flex flex-col items-center rounded-lg p-2 text-center',
              data.latencyDistribution.under5min && !data.latencyDistribution.under1min
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-muted/30',
            )}
          >
            <CheckCircle2
              className={cn(
                'h-4 w-4',
                data.latencyDistribution.under5min ? 'text-emerald-500' : 'text-muted-foreground',
              )}
            />
            <span className="mt-1 text-xs">{'<5分钟'}</span>
          </div>
          <div
            className={cn(
              'flex flex-col items-center rounded-lg p-2 text-center',
              data.latencyDistribution.under10min && !data.latencyDistribution.under5min
                ? 'bg-amber-100 dark:bg-amber-900/30'
                : 'bg-muted/30',
            )}
          >
            <AlertTriangle
              className={cn(
                'h-4 w-4',
                data.latencyDistribution.under10min && !data.latencyDistribution.under5min
                  ? 'text-amber-500'
                  : 'text-muted-foreground',
              )}
            />
            <span className="mt-1 text-xs">{'<10分钟'}</span>
          </div>
          <div
            className={cn(
              'flex flex-col items-center rounded-lg p-2 text-center',
              data.latencyDistribution.over10min ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted/30',
            )}
          >
            <XCircle
              className={cn(
                'h-4 w-4',
                data.latencyDistribution.over10min ? 'text-red-500' : 'text-muted-foreground',
              )}
            />
            <span className="mt-1 text-xs">{'>10分钟'}</span>
          </div>
        </div>

        {data.issues.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">问题列表</span>
            <div className="space-y-1">
              {data.issues.map((issue, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400"
                >
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            {data.healthy ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm">数据健康状态</span>
          </div>
          <Badge variant={data.healthy ? 'success' : 'destructive'} size="sm">
            {data.healthy ? '健康' : '异常'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
