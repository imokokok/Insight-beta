'use client';

import { useMemo, memo } from 'react';

import { Server, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  ComposedChart,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@/components/ui';
import { CHART_COLORS, getChartColor } from '@/lib/chart-config';
import { cn, formatNumber, formatTime } from '@/shared/utils';

import { TimeRangeSelector } from '../historical/TimeRangeSelector';

import type { NodeFeedSupportHistory, TimeRange } from '../../types';

export interface FeedSupportChartProps {
  data: NodeFeedSupportHistory[];
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
  title?: string;
  description?: string;
  height?: number;
  showActiveFeeds?: boolean;
}

export const FeedSupportChart = memo(function FeedSupportChart({
  data = [],
  timeRange,
  onTimeRangeChange,
  className,
  title = '节点 Feed 支持变化',
  description = '节点支持的 Feed 数量历史趋势',
  height = 400,
  showActiveFeeds = true,
}: FeedSupportChartProps) {
  const chartData = useMemo(() => {
    if (!data.length) return [];

    const timeMap = new Map<string, any>();

    data.forEach((node) => {
      node.history.forEach((point) => {
        const key = point.timestamp;
        if (!timeMap.has(key)) {
          timeMap.set(key, { timestamp: point.timestamp });
        }
        const entry = timeMap.get(key);
        entry[`${node.nodeName}_supported`] = point.supportedFeedsCount;
        if (showActiveFeeds) {
          entry[`${node.nodeName}_active`] = point.activeFeedsCount;
        }
        entry[`${node.nodeName}_updates`] = point.feedUpdatesCount;
      });
    });

    return Array.from(timeMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [data, showActiveFeeds]);
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


  const getNodeStats = (node: NodeFeedSupportHistory) => {
    const feedTrend =
      node.currentSupportedFeeds > node.avgSupportedFeeds
        ? 'up'
        : node.currentSupportedFeeds < node.avgSupportedFeeds
          ? 'down'
          : 'stable';

    return {
      currentSupportedFeeds: node.currentSupportedFeeds,
      avgSupportedFeeds: formatNumber(node.avgSupportedFeeds, 0),
      totalFeedUpdates: formatNumber(node.totalFeedUpdates, 0),
      feedTrend,
    };
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
            {data.map((node) => {
              const stats = getNodeStats(node);
              return (
                <div
                  key={node.nodeName}
                  className="rounded-lg border border-border bg-muted/50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium">{node.nodeName}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'bg-success/10 text-success',
                        stats.feedTrend === 'down' && 'bg-error/10 text-error',
                        stats.feedTrend === 'stable' &&
                          'bg-muted-foreground/10 text-muted-foreground',
                      )}
                    >
                      {stats.feedTrend === 'up' && <TrendingUp className="mr-1 h-3 w-3" />}
                      {stats.feedTrend === 'down' && <TrendingDown className="mr-1 h-3 w-3" />}
                      {stats.currentSupportedFeeds} feeds
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>平均支持 Feed 数</span>
                      <span className="font-medium">{stats.avgSupportedFeeds}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      <span>总更新次数：{stats.totalFeedUpdates}</span>
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
                支持的 Feed 数量趋势
              </h4>
              <ResponsiveContainer width="100%" height={height / 2}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    {data.map((node) => {
                      const color = getChartColor(data.indexOf(node));
                      return (
                        <linearGradient
                          key={node.nodeName}
                          id={`colorSupported${node.nodeName}`}
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
                    tickFormatter={formatLabel}
                    tickFormatter={(ts) => formatChartLabel(timeRange, ts)}
                    stroke="rgba(148, 163, 184, 0.5)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />

                  <YAxis
                    stroke="rgba(148, 163, 184, 0.5)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    allowDecimals={false}
                  />

                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;

                      return (
                        <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                            {formatLabel(label as string)}
                            {formatChartLabel(timeRange, label as string)}
                          </p>
                          <div className="space-y-1">
                            {payload.map((entry: any) => {
                              const nodeName = entry.dataKey
                                .replace('_supported', '')
                                .replace('_active', '');
                              const node = data.find((n) => n.nodeName === nodeName);
                              if (!node || !entry.value) return null;

                              const metric = entry.dataKey.includes('_supported') ? '支持' : '活跃';

                              return (
                                <div
                                  key={`${nodeName}-${entry.dataKey}`}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: entry.fill || entry.stroke }}
                                  />
                                  <span className="text-muted-foreground">
                                    {nodeName} ({metric})
                                  </span>
                                  <span className="font-medium">
                                    {formatNumber(entry.value, 0)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    cursor={{ stroke: CHART_COLORS.primary.DEFAULT, strokeWidth: 1 }}
                    cursor={{ stroke: CHART_COLORS.primary, strokeWidth: 1 }}
                  />

                  {data.map((node, index) => {
                    const color = getChartColor(index);
                    return (
                      <Area
                        key={`${node.nodeName}_supported`}
                        type="monotone"
                        dataKey={`${node.nodeName}_supported`}
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#colorSupported${node.nodeName})`}
                        fillOpacity={0.3}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2 }}
                        name={`${node.nodeName} 支持`}
                        isAnimationActive={true}
                        animationDuration={300}
                      />
                    );
                  })}

                  {showActiveFeeds &&
                    data.map((node, index) => {
                      const color = getChartColor(index);
                      return (
                        <Bar
                          key={`${node.nodeName}_active`}
                          dataKey={`${node.nodeName}_active`}
                          fill={color}
                          fillOpacity={0.2}
                          barSize={4}
                          name={`${node.nodeName} 活跃`}
                          isAnimationActive={true}
                          animationDuration={300}
                        />
                      );
                    })}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">Feed 更新次数趋势</h4>
              <ResponsiveContainer width="100%" height={height / 2}>
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148, 163, 184, 0.2)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(ts) => formatChartLabel(timeRange, ts)}
                    tickFormatter={formatLabel}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />

                  <YAxis
                    stroke="rgba(148, 163, 184, 0.5)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    allowDecimals={false}
                  />

                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;

                      return (
                        <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">
                            {formatChartLabel(timeRange, label as string)}
                            {formatLabel(label as string)}
                          <div className="space-y-1">
                            {payload.map((entry: any) => {
                              const nodeName = entry.dataKey.replace('_updates', '');
                              const node = data.find((n) => n.nodeName === nodeName);
                              if (!node || !entry.value) return null;

                              return (
                                <div key={nodeName} className="flex items-center gap-2 text-xs">
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: entry.fill }}
                                  />
                                  <span className="text-muted-foreground">{nodeName}</span>
                                  <span className="font-medium">
                                    {formatNumber(entry.value, 0)} 次
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

                  {data.map((node, index) => {
                    const color = getChartColor(index);
                    return (
                    cursor={{ stroke: CHART_COLORS.primary.DEFAULT, strokeWidth: 1 }}
                        key={node.nodeName}
                        dataKey={`${node.nodeName}_updates`}
                        fill={color}
                        fillOpacity={0.6}
                        name={node.nodeName}
                        isAnimationActive={true}
                        animationDuration={300}
                        radius={[2, 2, 0, 0]}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center" style={{ height }}>
            <p className="text-sm text-muted-foreground">暂无 Feed 支持数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
