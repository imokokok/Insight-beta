'use client';

import { useMemo, memo } from 'react';

import { Server } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Clock,
  Activity,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@/components/ui';
import { CHART_COLORS, getChartColor } from '@/lib/chart-config';
import { cn, formatChartLabel, formatNumber } from '@/shared/utils';

import type { NodePerformanceHistory, TimeRange } from '../../types';
import { TimeRangeSelector } from './TimeRangeSelector';

export interface NodePerformanceChartProps {
  data: NodePerformanceHistory[];
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
  title?: string;
  description?: string;
  height?: number;
}

export const NodePerformanceChart = memo(function NodePerformanceChart({
  data = [],
  timeRange,
  onTimeRangeChange,
  className,
  title = '节点表现追踪',
  description = '节点在线率与响应时间历史趋势',
  height = 400,
}: NodePerformanceChartProps) {
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
        entry[`${node.nodeName}_response`] = point.responseTime;
      });
    });

    return Array.from(timeMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [data]);

  const getNodeStats = (node: NodePerformanceHistory) => {
    const uptimeColor =
      node.currentUptime >= 99
        ? 'success'
        : node.currentUptime >= 95
          ? 'warning'
          : 'error';

    return {
      uptimeBadge: (
        <Badge variant="outline" className={cn(`bg-${uptimeColor}/10 text-${uptimeColor}`)}>
          {formatNumber(node.currentUptime, 2)}%
        </Badge>
      ),
      responseTime: formatNumber(node.avgResponseTime, 0) + 'ms',
      totalActivities: node.totalProposals + node.totalObservations,
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
                    {stats.uptimeBadge}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>响应时间：{stats.responseTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      <span>总活动：{formatNumber(stats.totalActivities, 0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {chartData.length > 0 && (
            <>
              <div>
                <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                  在线率趋势 (%)
                </h4>
                <ResponsiveContainer width="100%" height={height / 2}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      {data.map((node, index) => {
                        const color = getChartColor(index);
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
                      domain={[90, 100]}
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
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }}
                      cursor={{ stroke: CHART_COLORS.primary.DEFAULT, strokeWidth: 1 }}
                    />

                    <ReferenceArea
                      y1={95}
                      y2={100}
                      fill={CHART_COLORS.success.DEFAULT}
                      fillOpacity={0.05}
                    />

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
              </div>

              <div>
                <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                  响应时间趋势 (ms)
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
                                const nodeName = entry.dataKey.replace('_response', '');
                                const node = data.find((n) => n.nodeName === nodeName);
                                if (!node || !entry.value) return null;

                                return (
                                  <div
                                    key={nodeName}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <div
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: entry.stroke }}
                                    />
                                    <span className="text-muted-foreground">
                                      {nodeName}
                                    </span>
                                    <span className="font-medium">
                                      {formatNumber(entry.value, 0)}ms
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }}
                      cursor={{ stroke: CHART_COLORS.primary.DEFAULT, strokeWidth: 1 }}
                    />

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
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {chartData.length === 0 && (
            <div className="flex items-center justify-center" style={{ height }}>
              <p className="text-sm text-muted-foreground">暂无节点表现数据</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
