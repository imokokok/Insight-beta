'use client';

import { useMemo, memo } from 'react';

import { Activity, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@/components/ui';
import { CHART_COLORS, getChartColor } from '@/lib/chart-config';
import { cn, formatNumber, formatTime } from '@/shared/utils';

import { TimeRangeSelector } from '../historical/TimeRangeSelector';

import type { FeedUpdateFrequencyTrend, TimeRange } from '../../types';

export interface FeedUpdateFrequencyChartProps {
  data: FeedUpdateFrequencyTrend[];
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
  title?: string;
  description?: string;
  height?: number;
  showInterval?: boolean;
}

export const FeedUpdateFrequencyChart = memo(function FeedUpdateFrequencyChart({
  data = [],
  timeRange,
  onTimeRangeChange,
  className,
  title = 'Feed 更新频率趋势',
  description = 'Feed 数据更新频率与间隔分析',
  height = 400,
  showInterval = true,
}: FeedUpdateFrequencyChartProps) {
  const chartData = useMemo(() => {
    if (!data.length) return [];

    const timeMap = new Map<string, any>();

    data.forEach((feed) => {
      feed.history.forEach((point) => {
        const key = point.timestamp;
        if (!timeMap.has(key)) {
          timeMap.set(key, { timestamp: point.timestamp });
        }
        const entry = timeMap.get(key);
        entry[`${feed.feedId}_frequency`] = point.updatesPerMinute;
        if (showInterval) {
          entry[`${feed.feedId}_interval`] = point.avgIntervalSeconds;
        }
      });
    });

    return Array.from(timeMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [data, showInterval]);
  const formatLabel = (timestamp: string) => {
    const date = new Date(timestamp);
    switch (timeRange) {
      case '1h':
        return formatTime(date, 'HH:mm');
      case '24h':
        return formatTime(date, 'HH:mm');
      case '7d':
        return formatTime(date, 'MM/DD HH:mm');
      case '30d':
      case '90d':
        return formatTime(date, 'MM/DD');
      default:
        return formatTime(date, 'MM/DD');
    }
  };


  const getFeedStats = (feed: FeedUpdateFrequencyTrend) => {
    const frequencyTrend =
      feed.currentFrequency > feed.avgFrequency
        ? 'up'
        : feed.currentFrequency < feed.avgFrequency
          ? 'down'
          : 'stable';

    return {
      currentFrequency: formatNumber(feed.currentFrequency, 1),
      avgFrequency: formatNumber(feed.avgFrequency, 1),
      minFrequency: formatNumber(feed.minFrequency, 1),
      maxFrequency: formatNumber(feed.maxFrequency, 1),
      totalUpdates: formatNumber(feed.totalUpdates, 0),
      frequencyTrend,
    };
  };

  const formatFrequency = (value: number) => {
    if (value >= 60) return `${(value / 60).toFixed(1)}/s`;
    return `${value.toFixed(1)}/m`;
  };

  const formatInterval = (seconds: number) => {
    if (seconds >= 60) return `${(seconds / 60).toFixed(1)}m`;
    return `${seconds.toFixed(0)}s`;
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          {onTimeRangeChange && (
            <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
          )}
        </div>

        {data.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((feed) => {
              const stats = getFeedStats(feed);
              return (
                <div key={feed.feedId} className="rounded-lg border border-border bg-muted/50 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium">{feed.symbol}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{feed.pair}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'bg-success/10 text-success',
                        stats.frequencyTrend === 'down' && 'bg-error/10 text-error',
                        stats.frequencyTrend === 'stable' &&
                          'bg-muted-foreground/10 text-muted-foreground',
                      )}
                    >
                      {stats.frequencyTrend === 'up' && <TrendingUp className="mr-1 h-3 w-3" />}
                      {stats.frequencyTrend === 'down' && <TrendingDown className="mr-1 h-3 w-3" />}
                      {stats.currentFrequency}/m
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>平均频率</span>
                      <span className="font-medium">{stats.avgFrequency}/m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>最小频率</span>
                      <span className="font-medium">{stats.minFrequency}/m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>最大频率</span>
                      <span className="font-medium">{stats.maxFrequency}/m</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>总更新：{stats.totalUpdates}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {chartData.length > 0 ? (
          <div className="space-y-6">
            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                更新频率趋势 (次/分钟)
              </h4>
              <ResponsiveContainer width="100%" height={height / 2}>
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    {data.map((feed) => {
                      const color = getChartColor(data.indexOf(feed));
                      return (
                        <linearGradient
                          key={feed.feedId}
                          id={`colorFrequency${feed.feedId}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      );
                    })}
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148, 163, 184, 0.2)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(ts) => formatChartLabel(timeRange, ts)}
                    stroke="rgba(148, 163, 184, 0.5)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    tickFormatter={formatLabel}

                  <YAxis
                    tickFormatter={formatFrequency}
                    stroke="rgba(148, 163, 184, 0.5)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />

                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;

                      return (
                        <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">
                            {formatChartLabel(timeRange, label as string)}
                          </p>
                          <div className="space-y-1">
                            {payload.map((entry: any) => {
                              const feedId = entry.dataKey.replace('_frequency', '');
                              const feed = data.find((f) => f.feedId === feedId);
                            {formatLabel(label as string)}

                              return (
                                <div key={feedId} className="flex items-center gap-2 text-xs">
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: entry.fill }}
                                  />
                                  <span className="text-muted-foreground">{feed.symbol}</span>
                                  <span className="font-medium">
                                    {formatNumber(entry.value, 1)}/m
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }}
                    cursor={{ stroke: CHART_COLORS.primary, strokeWidth: 1 }}
                  />

                  <ReferenceLine y={1} stroke={CHART_COLORS.warning} strokeDasharray="3 3" />

                  {data.map((feed, index) => {
                    const color = getChartColor(index);
                    return (
                      <Area
                        key={feed.feedId}
                        type="monotone"
                    cursor={{ stroke: CHART_COLORS.primary.DEFAULT, strokeWidth: 1 }}
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#colorFrequency${feed.feedId})`}
                        fillOpacity={0.3}
                    stroke={CHART_COLORS.warning.DEFAULT}
                        activeDot={{ r: 4, strokeWidth: 2 }}
                        name={feed.symbol}
                        isAnimationActive={true}
                        animationDuration={300}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {showInterval && (
              <div>
                <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                  平均更新间隔 (秒)
                </h4>
                <ResponsiveContainer width="100%" height={height / 2}>
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148, 163, 184, 0.2)"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(ts) => formatChartLabel(timeRange, ts)}
                      stroke="rgba(148, 163, 184, 0.5)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />

                    <YAxis
                      tickFormatter={formatInterval}
                      stroke="rgba(148, 163, 184, 0.5)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                      tickFormatter={formatLabel}

                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;

                        return (
                          <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                              {formatChartLabel(timeRange, label as string)}
                            </p>
                            <div className="space-y-1">
                              {payload.map((entry: any) => {
                                const feedId = entry.dataKey.replace('_interval', '');
                                const feed = data.find((f) => f.feedId === feedId);
                                if (!feed || !entry.value) return null;

                                return (
                                  <div key={feedId} className="flex items-center gap-2 text-xs">
                                    <div
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: entry.stroke }}
                                    />
                                    <span className="text-muted-foreground">{feed.symbol}</span>
                              {formatLabel(label as string)}
                                      {formatInterval(entry.value)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }}
                      cursor={{ stroke: CHART_COLORS.primary, strokeWidth: 1 }}
                    />

                    {data.map((feed, index) => {
                      const color = getChartColor(index);
                      return (
                        <Line
                          key={feed.feedId}
                          type="monotone"
                          dataKey={`${feed.feedId}_interval`}
                          stroke={color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 2 }}
                          name={feed.symbol}
                          isAnimationActive={true}
                          animationDuration={300}
                        />
                      );
                    })}
                      cursor={{ stroke: CHART_COLORS.primary.DEFAULT, strokeWidth: 1 }}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center" style={{ height }}>
            <p className="text-sm text-muted-foreground">暂无更新频率数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
