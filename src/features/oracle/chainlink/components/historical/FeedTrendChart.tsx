'use client';

import { useMemo, memo, useState } from 'react';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { CHART_COLORS, getChartColor } from '@/lib/chart-config';
import { cn, formatChartLabel, formatPrice, formatNumber, TrendIcon } from '@/shared/utils';

import { TimeRangeSelector } from './TimeRangeSelector';

import type { FeedTrendData, TimeRange } from '../../types';

export interface FeedTrendChartProps {
  data: FeedTrendData[];
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
  title?: string;
  description?: string;
  showVolume?: boolean;
  height?: number;
}

export const FeedTrendChart = memo(function FeedTrendChart({
  data = [],
  timeRange,
  onTimeRangeChange,
  className,
  title = 'Feed 价格趋势',
  description = '多喂价历史价格趋势对比',
  height = 400,
}: FeedTrendChartProps) {
  const [selectedFeeds, setSelectedFeeds] = useState<string[]>(
    data.slice(0, 3).map((f) => f.feedId),
  );

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
        entry[`${feed.feedId}_price`] = point.price;
        entry[`${feed.feedId}_volume`] = point.volume || 0;
      });
    });

    return Array.from(timeMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [data]);

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(2);
  };

  const toggleFeed = (feedId: string) => {
    setSelectedFeeds((prev) =>
      prev.includes(feedId) ? prev.filter((id) => id !== feedId) : [...prev, feedId].slice(0, 5),
    );
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendIcon trend="up" className="h-3 w-3" />;
    if (change < 0) return <TrendIcon trend="down" className="h-3 w-3" />;
    return <TrendIcon trend="stable" className="h-3 w-3" />;
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
          <div className="mt-4 flex flex-wrap gap-2">
            {data.map((feed) => {
              const isSelected = selectedFeeds.includes(feed.feedId);
              const changeColor =
                feed.priceChange24h > 0
                  ? 'text-success'
                  : feed.priceChange24h < 0
                    ? 'text-error'
                    : 'text-muted-foreground';

              return (
                <button
                  key={feed.feedId}
                  type="button"
                  onClick={() => toggleFeed(feed.feedId)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all',
                    'hover:border-primary/50 hover:shadow-sm',
                    isSelected
                      ? 'border-primary/50 bg-primary/5 shadow-sm'
                      : 'border-border bg-muted/50',
                  )}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{feed.symbol}</span>
                    <span className="text-muted-foreground">{feed.pair}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-medium">{formatPrice(feed.currentPrice)}</span>
                    <div className={cn('flex items-center gap-1', changeColor)}>
                      {getPriceChangeIcon(feed.priceChange24h)}
                      <span className="text-xs">
                        {feed.priceChangePercentage24h > 0 ? '+' : ''}
                        {formatNumber(feed.priceChangePercentage24h, 2)}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                {selectedFeeds.map((feedId, index) => {
                  const color = getChartColor(index);
                  return (
                    <linearGradient key={feedId} id={`color${feedId}`} x1="0" y1="0" x2="0" y2="1">
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
              />

              <YAxis
                tickFormatter={formatYAxis}
                stroke="rgba(148, 163, 184, 0.5)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={60}
                tickCount={5}
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
                          const feedId = entry.dataKey.replace('_price', '');
                          const feed = data.find((f) => f.feedId === feedId);
                          if (!feed || !entry.value) return null;

                          return (
                            <div key={feedId} className="flex items-center gap-2 text-xs">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.fill }}
                              />
                              <span className="text-muted-foreground">{feed.symbol}</span>
                              <span className="font-medium">{formatPrice(entry.value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
                cursor={{ stroke: CHART_COLORS.primary, strokeWidth: 1 }}
              />

              <Legend
                verticalAlign="bottom"
                height={36}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  return (
                    <div className="mt-4 flex flex-wrap justify-center gap-4">
                      {payload.map((entry: any) => {
                        const feed = data.find((f) => f.feedId === entry.value);
                        if (!feed) return null;

                        return (
                          <div key={entry.value} className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-xs text-muted-foreground">{feed.pair}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />

              {selectedFeeds.map((feedId, index) => {
                const color = getChartColor(index);
                return (
                  <Area
                    key={feedId}
                    type="monotone"
                    dataKey={`${feedId}_price`}
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#color${feedId})`}
                    fillOpacity={0.3}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                    name={data.find((f) => f.feedId === feedId)?.pair || feedId}
                    isAnimationActive={true}
                    animationDuration={300}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center" style={{ height }}>
            <p className="text-sm text-muted-foreground">暂无数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
