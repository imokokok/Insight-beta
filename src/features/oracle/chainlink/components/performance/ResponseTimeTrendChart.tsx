'use client';

import { useMemo, memo } from 'react';

import { Server, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@/components/ui';
import { CHART_COLORS, getChartColor } from '@/lib/chart-config';
import { cn, formatChartLabel, formatNumber } from '@/shared/utils';

import type { NodeResponseTimeTrend, TimeRange } from '../../types';
import { TimeRangeSelector } from '../historical/TimeRangeSelector';

export interface ResponseTimeTrendChartProps {
  data: NodeResponseTimeTrend[];
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
  title?: string;
  description?: string;
  height?: number;
  showPercentiles?: boolean;
}

export const ResponseTimeTrendChart = memo(function ResponseTimeTrendChart({
  data = [],
  timeRange,
  onTimeRangeChange,
  className,
  title = '节点响应时间趋势',
  description = '节点响应时间历史趋势与百分位分析',
  height = 400,
  showPercentiles = true,
}: ResponseTimeTrendChartProps) {
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
        entry[`${node.nodeName}_response`] = point.responseTime;
        if (showPercentiles) {
          entry[`${node.nodeName}_p50`] = point.p50ResponseTime;
          entry[`${node.nodeName}_p95`] = point.p95ResponseTime;
          entry[`${node.nodeName}_p99`] = point.p99ResponseTime;
        }
      });
    });

    return Array.from(timeMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [data, showPercentiles]);

  const getNodeStats = (node: NodeResponseTimeTrend) => {
    const responseTimeTrend =
      node.currentResponseTime < node.avgResponseTime
        ? 'up'
        : node.currentResponseTime > node.avgResponseTime
          ? 'down'
          : 'stable';

    return {
      currentResponseTime: formatNumber(node.currentResponseTime, 0),
      avgResponseTime: formatNumber(node.avgResponseTime, 0),
      minResponseTime: formatNumber(node.minResponseTime, 0),
      maxResponseTime: formatNumber(node.maxResponseTime, 0),
      p50ResponseTime: formatNumber(node.p50ResponseTime, 0),
      p95ResponseTime: formatNumber(node.p95ResponseTime, 0),
      p99ResponseTime: formatNumber(node.p99ResponseTime, 0),
      responseTimeTrend,
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
                        stats.responseTimeTrend === 'down' && 'bg-error/10 text-error',
                        stats.responseTimeTrend === 'stable' &&
                          'bg-muted-foreground/10 text-muted-foreground'
                      )}
                    >
                      {stats.responseTimeTrend === 'up' && (
                        <TrendingUp className="mr-1 h-3 w-3" />
                      )}
                      {stats.responseTimeTrend === 'down' && (
                        <TrendingDown className="mr-1 h-3 w-3" />
                      )}
                      {stats.currentResponseTime}ms
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>平均响应</span>
                      <span className="font-medium">{stats.avgResponseTime}ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>最小响应</span>
                      <span className="font-medium">{stats.minResponseTime}ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>最大响应</span>
                      <span className="font-medium">{stats.maxResponseTime}ms</span>
                    </div>
                    {showPercentiles && (
                      <>
                        <div className="flex items-center justify-between">
                          <span>P50</span>
                          <span className="font-medium">{stats.p50ResponseTime}ms</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>P95</span>
                          <span className="font-medium">{stats.p95ResponseTime}ms</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>P99</span>
                          <span className="font-medium">{stats.p99ResponseTime}ms</span>
                        </div>
                      </>
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
                tickFormatter={(v) => `${v}ms`}
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
                          const nodeName = entry.dataKey.replace('_response', '').replace(/_p\d+/, '');
                          const node = data.find((n) => n.nodeName === nodeName);
                          if (!node || !entry.value) return null;

                          const metric = entry.dataKey.includes('_p')
                            ? entry.dataKey.split('_').pop()
                            : 'AVG';

                          return (
                            <div
                              key={`${nodeName}-${entry.dataKey}`}
                              className="flex items-center gap-2 text-xs"
                            >
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.stroke }}
                              />
                              <span className="text-muted-foreground">
                                {nodeName}
                                {metric !== 'AVG' && ` ${metric}`}
                              </span>
                              <span className="font-medium">{formatNumber(entry.value, 0)}ms</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
                cursor={{ stroke: CHART_COLORS.primary.DEFAULT, strokeWidth: 1 }}
              />

              {showPercentiles && (
                <>
                  <ReferenceLine
                    y={500}
                    stroke={CHART_COLORS.success.DEFAULT}
                    strokeDasharray="3 3"
                    label={{ value: '500ms', fontSize: 10, fill: CHART_COLORS.success.DEFAULT }}
                  />
                  <ReferenceLine
                    y={2000}
                    stroke={CHART_COLORS.error.DEFAULT}
                    strokeDasharray="3 3"
                    label={{ value: '2000ms', fontSize: 10, fill: CHART_COLORS.error.DEFAULT }}
                  />
                </>
              )}

              {data.map((node, index) => {
                const color = getChartColor(index);
                return (
                  <Line
                    key={node.nodeName}
                    type="monotone"
                    dataKey={`${node.nodeName}_response`}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2 }}
                    name={node.nodeName}
                    isAnimationActive={true}
                    animationDuration={300}
                  />
                );
              })}

              {showPercentiles &&
                data.map((node, index) => {
                  const color = getChartColor(index);
                  return (
                    <Line
                      key={`${node.nodeName}_p95`}
                      type="monotone"
                      dataKey={`${node.nodeName}_p95`}
                      stroke={color}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      name={`${node.nodeName} P95`}
                      isAnimationActive={true}
                      animationDuration={300}
                    />
                  );
                })}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center" style={{ height }}>
            <p className="text-sm text-muted-foreground">暂无响应时间数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
