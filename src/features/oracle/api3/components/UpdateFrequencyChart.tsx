'use client';

import { useState, useEffect, useMemo } from 'react';

import { Activity, AlertTriangle, Clock, RefreshCw, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { SkeletonList } from '@/components/ui';
import { TIME_RANGE_OPTIONS } from '@/config/constants';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import type {
  UpdateFrequencyStats,
  UpdateIntervalPoint,
  UpdateFrequencyResponse,
} from '../types/api3';

interface UpdateFrequencyChartProps {
  dapiName: string;
  chain?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  className?: string;
}

const generateMockData = (timeRange: string): UpdateFrequencyResponse => {
  const timeRangeMs: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  const points =
    timeRange === '1h' ? 60 : timeRange === '24h' ? 96 : timeRange === '7d' ? 168 : 720;
  const baseInterval = (timeRangeMs[timeRange] ?? 24 * 60 * 60 * 1000) / points;

  const intervals: UpdateIntervalPoint[] = [];
  const intervalValues: number[] = [];
  let anomalyCount = 0;
  let anomalyReason: string | undefined;

  const now = Date.now();

  for (let i = 0; i < points; i++) {
    const isAnomaly = Math.random() < 0.05;
    let intervalMs: number;

    if (isAnomaly) {
      intervalMs = baseInterval * (3 + Math.random() * 5);
      anomalyCount++;
      if (!anomalyReason) {
        anomalyReason = 'Update delay detected';
      }
    } else {
      intervalMs = baseInterval * (0.8 + Math.random() * 0.4);
    }

    intervalValues.push(intervalMs);
    intervals.push({
      timestamp: new Date(now - (points - i) * baseInterval).toISOString(),
      intervalMs: Math.round(intervalMs),
      isAnomaly,
    });
  }

  const avgIntervalMs = intervalValues.reduce((a, b) => a + b, 0) / intervalValues.length;
  const minIntervalMs = Math.min(...intervalValues);
  const maxIntervalMs = Math.max(...intervalValues);

  const stats: UpdateFrequencyStats = {
    dapiName: 'ETH/USD',
    chain: 'ethereum',
    avgUpdateIntervalMs: Math.round(avgIntervalMs),
    minUpdateIntervalMs: Math.round(minIntervalMs),
    maxUpdateIntervalMs: Math.round(maxIntervalMs),
    updateCount: points,
    lastUpdateTime: new Date(now).toISOString(),
    anomalyDetected: anomalyCount > 0,
    anomalyReason: anomalyCount > 0 ? `${anomalyCount} anomalies detected` : undefined,
  };

  return {
    stats,
    intervals,
    timeRange,
  };
};

function formatInterval(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export function UpdateFrequencyChart({
  dapiName,
  chain,
  timeRange: initialTimeRange = '24h',
  className,
}: UpdateFrequencyChartProps) {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>(initialTimeRange);
  const [data, setData] = useState<UpdateFrequencyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        setData(generateMockData(timeRange));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dapiName, chain, timeRange]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.intervals.map((item) => ({
      ...item,
      date: new Date(item.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: timeRange === '1h' || timeRange === '24h' ? 'numeric' : undefined,
        minute: timeRange === '1h' ? 'numeric' : undefined,
      }),
    }));
  }, [data, timeRange]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setData(generateMockData(timeRange));
      setIsLoading(false);
    }, 400);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t('api3.frequency.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={1} />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t('api3.frequency.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const { stats } = data;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {dapiName}
              {chain && (
                <Badge variant="secondary" className="ml-2 capitalize">
                  {chain}
                </Badge>
              )}
              {stats.anomalyDetected && (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {t('api3.frequency.anomaly')}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">{t('api3.frequency.description')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border p-1">
              {TIME_RANGE_OPTIONS.map((option) => (
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
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              {t('api3.frequency.avgInterval')}
            </div>
            <p className="mt-1 text-xl font-bold">{formatInterval(stats.avgUpdateIntervalMs)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {t('api3.frequency.minInterval')}
            </div>
            <p className="mt-1 text-xl font-bold text-green-500">
              {formatInterval(stats.minUpdateIntervalMs)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {t('api3.frequency.maxInterval')}
            </div>
            <p className="mt-1 text-xl font-bold text-orange-500">
              {formatInterval(stats.maxUpdateIntervalMs)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              {t('api3.frequency.updateCount')}
            </div>
            <p className="mt-1 text-xl font-bold">{stats.updateCount}</p>
          </div>
        </div>

        {stats.anomalyDetected && stats.anomalyReason && (
          <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-orange-700 dark:text-orange-300">
              {stats.anomalyReason}
            </span>
          </div>
        )}

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(v) => formatInterval(v)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value) => [
                  formatInterval(Number(value) || 0),
                  t('api3.frequency.interval'),
                ]}
                labelFormatter={(label) => `${t('common.time')}: ${label}`}
              />
              <ReferenceLine
                y={stats.avgUpdateIntervalMs}
                stroke="#8b5cf6"
                strokeDasharray="5 5"
                label={{ value: t('api3.frequency.avg'), fontSize: 10, fill: '#8b5cf6' }}
              />
              <Bar dataKey="intervalMs" name={t('api3.frequency.interval')}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isAnomaly ? '#ef4444' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-blue-500" />
            <span>{t('api3.frequency.normalUpdate')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-red-500" />
            <span>{t('api3.frequency.anomalyUpdate')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-0.5 bg-purple-500" />
            <span>{t('api3.frequency.avgLine')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
