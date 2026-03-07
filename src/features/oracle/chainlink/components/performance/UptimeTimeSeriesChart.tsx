'use client';

import { useMemo, memo } from 'react';

import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  Server,
  Activity,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@/components/ui';
import { CHART_COLORS, getChartColor } from '@/lib/chart-config';
import { cn, formatChartLabel, formatNumber, getStatusColor } from '@/shared/utils';

import type { NodeUptimeTimeSeries, TimeRange } from '../../types';
import { TimeRangeSelector } from '../historical/TimeRangeSelector';

export interface UptimeTimeSeriesChartProps {
  data: NodeUptimeTimeSeries[];
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
  title?: string;
  description?: string;
  height?: number;
  showComparison?: boolean;
}

export const UptimeTimeSeriesChart = memo(function UptimeTimeSeriesChart({
  data = [],
  timeRange,
  onTimeRangeChange,
  className,
  title = '节点历史在线率',
  description = '节点在线率时间序列分析',
  height = 400,
  showComparison = true,
}: UptimeTimeSeriesChartProps) {
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
        entry[`${node.nodeName}_uptime`] = point.uptime;
        entry[`${node.nodeName}_status`] = point.status;
      });
    });

    return Array.from(timeMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [data]);

  const getNodeStats = (node: NodeUptimeTimeSeries) => {
    const uptimeTrend =
      node.currentUptime > node.avgUptime
        ? 'up'
        : node.currentUptime < node.avgUptime
          ? 'down'
          : 'stable';

    return {
      currentUptime: formatNumber(node.currentUptime, 2),
      avgUptime: formatNumber(node.avgUptime, 2),
      minUptime: formatNumber(node.minUptime, 2),
      maxUptime: formatNumber(node.maxUptime, 2),
      downtimeCount: node.downtimeCount,
      totalDowntimeDuration: node.totalDowntimeDuration,
      uptimeTrend,
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
                        stats.uptimeTrend === 'down' && 'bg-error/10 text-error',
                        stats.uptimeTrend === 'stable' && 'bg-muted-foreground/10 text-muted-foreground'
                      )}
                    >
                      {stats.uptimeTrend === 'up' && <TrendingUp className="mr-1 h-3 w-3" />}
                      {stats.uptimeTrend === 'down' && <TrendingDown className="mr-1 h-3 w-3" />}
                      {stats.currentUptime}%
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>平均在线率</span>
                      <span className="font-medium">{stats.avgUptime}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>最低在线率</span>
                      <span className="font-medium">{stats.minUptime}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>最高在线率</span>
                      <span className="font-medium">{stats.maxUptime}%</span>
                    </div>
                    {node.downtimeCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        <span>
                          中断次数：{node.downtimeCount} (
                          {formatNumber(node.totalDowntimeDuration / 60, 1)}分钟)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
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
                {data.map((node) => {
                  const color = getChartColor(data.indexOf(node));
                  return (
                    <linearGradient
                      key={node.nodeName}
                      id={`colorUptime${node.nodeName}`}
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
              />

              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                stroke="rgba(148, 163, 184, 0.5)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={40}
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
                          const nodeName = entry.dataKey.replace('_uptime', '');
                          const node = data.find((n) => n.nodeName === nodeName);
                          if (!node || !entry.value) return null;

                          const point = node.history.find(
                            (p) => p.timestamp === label
                          );

                          return (
                            <div
                              key={nodeName}
                              className="flex items-center gap-2 text-xs"
                            >
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.fill }}
                              />
                              <span className="text-muted-foreground">
                                {nodeName}
                              </span>
                              <span className="font-medium">
                                {formatNumber(entry.value, 2)}%
                              </span>
                              {point && (
                                <div
                                  className={cn(
                                    'h-2 w-2 rounded-full',
                                    getStatusColor(point.status)
                                  )}
                                  title={point.status}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
                cursor={{ stroke: CHART_COLORS.primary.DEFAULT, strokeWidth: 1 }}
              />

              {showComparison && (
                <>
                  <ReferenceArea
                    y1={95}
                    y2={100}
                    fill={CHART_COLORS.success.DEFAULT}
                    fillOpacity={0.05}
                  />
                  <ReferenceArea
                    y1={80}
                    y2={95}
                    fill={CHART_COLORS.warning.DEFAULT}
                    fillOpacity={0.05}
                  />
                  <ReferenceArea
                    y1={0}
                    y2={80}
                    fill={CHART_COLORS.error.DEFAULT}
                    fillOpacity={0.05}
                  />
                  <ReferenceLine
                    y={95}
                    stroke={CHART_COLORS.success.DEFAULT}
                    strokeDasharray="3 3"
                  />
                  <ReferenceLine
                    y={80}
                    stroke={CHART_COLORS.warning.DEFAULT}
                    strokeDasharray="3 3"
                  />
                </>
              )}

              {data.map((node, index) => {
                const color = getChartColor(index);
                return (
                  <Area
                    key={node.nodeName}
                    type="monotone"
                    dataKey={`${node.nodeName}_uptime`}
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#colorUptime${node.nodeName})`}
                    fillOpacity={0.3}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2 }}
                    name={node.nodeName}
                    isAnimationActive={true}
                    animationDuration={300}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center" style={{ height }}>
            <p className="text-sm text-muted-foreground">暂无在线率数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
