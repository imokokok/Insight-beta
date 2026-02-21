'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import { RefreshCw, TrendingUp, AlertTriangle, Clock, Activity } from 'lucide-react';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { useI18n } from '@/i18n';
import { fetchApiData, formatTime } from '@/shared/utils';
import { cn } from '@/shared/utils';

import type { DeviationStats } from '../types/chainlink';

const timeRangeOptions = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
] as const;

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string;
}

function StatCard({ title, value, icon, colorClass }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', colorClass)}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatUpdateFrequency(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }
  const hours = Math.floor(seconds / 3600);
  return `${hours}h`;
}

function formatAvgInterval(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  if (seconds < 3600) {
    const minutes = (seconds / 60).toFixed(1);
    return `${minutes}m`;
  }
  const hours = (seconds / 3600).toFixed(1);
  return `${hours}h`;
}

export function DeviationTriggerStats() {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [stats, setStats] = useState<DeviationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('timeRange', timeRange);

      const data = await fetchApiData<DeviationStats>(
        `/api/oracle/chainlink/deviation?${params.toString()}`,
      );
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deviation data');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const top5Feeds = useMemo(() => {
    if (!stats?.mostActiveFeeds) return [];
    return stats.mostActiveFeeds.slice(0, 5);
  }, [stats?.mostActiveFeeds]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <div className="text-center">
            <p className="font-medium text-foreground">{t('common.error') || '加载数据失败'}</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.retry') || '重试'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (stats.triggers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t('chainlink.deviation.title') || '偏差触发统计'}
              </CardTitle>
              <CardDescription>
                {t('chainlink.deviation.description') || '监控 Chainlink 数据 Feed 的偏差触发情况'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border p-1">
                {timeRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTimeRange(option.value)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      timeRange === option.value
                        ? 'text-primary-foreground bg-primary'
                        : 'hover:bg-muted',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
          <TrendingUp className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium text-foreground">
              {t('chainlink.deviation.noData') || '暂无数据'}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('chainlink.deviation.noDataDescription') || '当前时间范围内没有偏差触发记录'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t('chainlink.deviation.title') || '偏差触发统计'}
              </CardTitle>
              <CardDescription>
                {t('chainlink.deviation.description') || '监控 Chainlink 数据 Feed 的偏差触发情况'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border p-1">
                {timeRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTimeRange(option.value)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      timeRange === option.value
                        ? 'text-primary-foreground bg-primary'
                        : 'hover:bg-muted',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('chainlink.deviation.totalTriggers') || '总触发次数'}
          value={stats.totalTriggers.toLocaleString()}
          icon={<TrendingUp className="h-6 w-6 text-orange-600" />}
          colorClass="bg-orange-100 dark:bg-orange-900"
        />
        <StatCard
          title={t('chainlink.deviation.totalFeeds') || '总 Feed 数'}
          value={stats.triggers.length}
          icon={<Activity className="h-6 w-6 text-blue-600" />}
          colorClass="bg-blue-100 dark:bg-blue-900"
        />
        <StatCard
          title={t('chainlink.deviation.activeFeeds') || '活跃触发 Feed'}
          value={stats.triggers.filter((f) => f.triggerCount > 0).length}
          icon={<Clock className="h-6 w-6 text-green-600" />}
          colorClass="bg-green-100 dark:bg-green-900"
        />
        <StatCard
          title={t('chainlink.deviation.lastUpdated') || '最后更新'}
          value={formatTime(stats.generatedAt)}
          icon={<RefreshCw className="h-6 w-6 text-purple-600" />}
          colorClass="bg-purple-100 dark:bg-purple-900"
        />
      </div>

      {top5Feeds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              {t('chainlink.deviation.topActiveFeeds') || '触发最活跃的前 5 个 Feed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {top5Feeds.map((feed, index) => (
                <Card key={`${feed.feedName}-${feed.chain}-${index}`} className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{feed.feedName}</p>
                        <p className="text-xs text-muted-foreground">{feed.chain}</p>
                      </div>
                      <Badge variant="outline" className="ml-2 shrink-0">
                        #{index + 1}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold text-orange-600">
                        {feed.triggerCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('chainlink.deviation.triggerCount') || '触发次数'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            {t('chainlink.deviation.allFeeds') || '所有 Feed 偏差触发详情'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('chainlink.deviation.feedName') || 'Feed 名称'}</TableHead>
                  <TableHead>{t('chainlink.deviation.chain') || '链'}</TableHead>
                  <TableHead>{t('chainlink.deviation.deviationThreshold') || '偏差阈值'}</TableHead>
                  <TableHead>{t('chainlink.deviation.triggerCount') || '触发次数'}</TableHead>
                  <TableHead>{t('chainlink.deviation.updateFrequency') || '更新频率'}</TableHead>
                  <TableHead>
                    {t('chainlink.deviation.avgUpdateInterval') || '平均更新间隔'}
                  </TableHead>
                  <TableHead>
                    {t('chainlink.deviation.lastTriggeredAt') || '最后触发时间'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.triggers.map((feed, index) => (
                  <TableRow key={`${feed.feedName}-${feed.chain}-${index}`}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{feed.feedName}</div>
                        <div className="text-xs text-muted-foreground">{feed.pair}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {feed.chain}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{feed.deviationThreshold}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'font-mono font-semibold',
                          feed.triggerCount > 0 && 'text-orange-600 dark:text-orange-400',
                        )}
                      >
                        {feed.triggerCount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatUpdateFrequency(feed.updateFrequency)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        {formatAvgInterval(feed.avgUpdateInterval)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {feed.lastTriggeredAt ? (
                        <span className="text-sm">{formatTime(feed.lastTriggeredAt)}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
