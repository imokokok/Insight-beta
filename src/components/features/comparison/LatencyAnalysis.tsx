'use client';

import { useMemo, useState } from 'react';

import { Clock, Zap, AlertCircle, TrendingUp, TrendingDown, Activity, Server } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  Cell,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n';
import { statusColors } from '@/lib/constants/colors';
import type { LatencyAnalysis, LatencyTrend } from '@/types/oracle';
import { cn } from '@/shared/utils';

interface LatencyAnalysisProps {
  data?: LatencyAnalysis;
  trends?: LatencyTrend[];
  isLoading?: boolean;
  selectedSymbol?: string;
}

/** 状态配置 - 使用统一的状态色板 */
const statusConfig = {
  healthy: {
    color: statusColors.healthy.dot,
    labelKey: 'comparison.status.healthy',
    icon: Zap,
    ariaLabelKey: statusColors.healthy.ariaLabelKey,
  },
  degraded: {
    color: statusColors.degraded.dot,
    labelKey: 'comparison.status.degraded',
    icon: AlertCircle,
    ariaLabelKey: statusColors.degraded.ariaLabelKey,
  },
  stale: {
    color: statusColors.stale.dot,
    labelKey: 'comparison.status.stale',
    icon: Clock,
    ariaLabelKey: statusColors.stale.ariaLabelKey,
  },
};

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatFrequency(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(0)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export function LatencyAnalysisView({
  data,
  trends,
  isLoading,
  selectedSymbol,
}: LatencyAnalysisProps) {
  const { t } = useI18n();
  // This state setter is used in future enhancements

  void useState<string | null>(null);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.metrics.map((m) => ({
      protocol: m.protocol,
      latency: m.latencyMs,
      p50: m.percentile50,
      p90: m.percentile90,
      p99: m.percentile99,
      frequency: m.updateFrequency,
      status: m.status,
    }));
  }, [data]);

  const trendData = useMemo(() => {
    if (!trends || !selectedSymbol) return [];
    const symbolTrends = trends.filter((t) => t.symbol === selectedSymbol);

    // Merge trends from different protocols into time series
    const timeMap = new Map<string, Record<string, number>>();

    symbolTrends.forEach((trend) => {
      trend.data.forEach((point) => {
        if (!timeMap.has(point.timestamp)) {
          timeMap.set(point.timestamp, {});
        }
        const entry = timeMap.get(point.timestamp);
        if (entry) {
          entry[trend.protocol] = point.avgLatency;
        }
      });
    });

    return Array.from(timeMap.entries())
      .map(([timestamp, values]) => ({
        timestamp: new Date(timestamp).toLocaleTimeString(),
        ...values,
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [trends, selectedSymbol]);

  const summaryCards = useMemo(() => {
    if (!data) return [];
    const { summary } = data;
    return [
      {
        title: t('comparison.latency.summary.avgLatency'),
        value: formatLatency(summary.avgLatency),
        icon: Clock,
        trend: summary.avgLatency < 5000 ? 'down' : 'up',
        trendValue: t('comparison.latency.vsLastHour'),
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      },
      {
        title: t('comparison.latency.summary.maxLatency'),
        value: formatLatency(summary.maxLatency),
        icon: Activity,
        trend: null,
        trendValue: t('comparison.latency.currentPeak'),
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
      },
      {
        title: t('comparison.latency.summary.healthyNodes'),
        value: summary.healthyFeeds.toString(),
        icon: Zap,
        trend: 'up',
        trendValue: t('comparison.latency.normalOperation'),
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
      },
      {
        title: t('comparison.latency.summary.degradedNodes'),
        value: (summary.degradedFeeds + summary.staleFeeds).toString(),
        icon: AlertCircle,
        trend: summary.degradedFeeds + summary.staleFeeds > 0 ? 'up' : 'down',
        trendValue: t('comparison.latency.needsAttention'),
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      },
    ];
  }, [data, t]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.metrics.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('comparison.latency.title')}</CardTitle>
          <CardDescription>{t('comparison.status.noData')}</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground flex h-64 items-center justify-center">
          <Server className="mr-2 h-5 w-5" />
          {t('comparison.latency.selectAssetPair')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{t('comparison.latency.title')}</CardTitle>
            <CardDescription className="text-muted-foreground mt-1 text-sm">
              {t('comparison.latency.description')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="mr-1 h-3 w-3" />
              {t('comparison.latency.live')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.title}
              className={cn('rounded-lg border p-4 transition-all hover:shadow-md', card.bgColor)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">{card.title}</p>
                  <p className={cn('mt-1 text-2xl font-bold', card.color)}>{card.value}</p>
                </div>
                <div className={cn('rounded-full bg-white/50 p-2', card.color)}>
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
              {card.trend && (
                <div className="mt-2 flex items-center text-xs">
                  {card.trend === 'up' ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-red-500" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3 text-emerald-500" />
                  )}
                  <span className={card.trend === 'up' ? 'text-red-500' : 'text-emerald-500'}>
                    {card.trendValue}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="latency" className="w-full" value="latency" onValueChange={() => {}}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="latency">{t('comparison.latency.tabs.distribution')}</TabsTrigger>
            <TabsTrigger value="frequency">{t('comparison.latency.tabs.frequency')}</TabsTrigger>
            <TabsTrigger value="trends">{t('comparison.latency.tabs.trends')}</TabsTrigger>
          </TabsList>

          <TabsContent value="latency" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="protocol"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(0, 3)}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatLatency(value)} />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-white p-3 text-sm shadow-lg">
                            <p className="mb-2 font-semibold capitalize">{label}</p>
                            <div className="space-y-1">
                              <p>
                                {t('comparison.latency.currentLatency')}:{' '}
                                <span className="font-medium">{formatLatency(data.latency)}</span>
                              </p>
                              <p>
                                P50: <span className="font-medium">{formatLatency(data.p50)}</span>
                              </p>
                              <p>
                                P90: <span className="font-medium">{formatLatency(data.p90)}</span>
                              </p>
                              <p>
                                P99: <span className="font-medium">{formatLatency(data.p99)}</span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={5000}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={t('comparison.latency.threshold')}
                  />
                  <Bar
                    dataKey="latency"
                    radius={[4, 4, 0, 0]}
                    role="img"
                    aria-label={t('comparison.latency.chartAriaLabel')}
                  >
                    {chartData.map((entry, index) => {
                      const statusColor =
                        entry.status === 'healthy'
                          ? '#10b981'
                          : entry.status === 'degraded'
                            ? '#f59e0b'
                            : '#ef4444';
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={statusColor}
                          role="graphics-symbol"
                          aria-label={`${entry.protocol}: ${t(statusConfig[entry.status].ariaLabelKey)}`}
                          tabIndex={0}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Latency Table */}
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">
                      {t('comparison.table.protocol')}
                    </th>
                    <th className="px-4 py-2 text-left font-medium">
                      {t('comparison.table.assetPair')}
                    </th>
                    <th className="px-4 py-2 text-right font-medium">
                      {t('comparison.latency.currentLatency')}
                    </th>
                    <th className="px-4 py-2 text-right font-medium">P50</th>
                    <th className="px-4 py-2 text-right font-medium">P90</th>
                    <th className="px-4 py-2 text-center font-medium">
                      {t('comparison.table.status')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.metrics.slice(0, 5).map((metric, idx) => {
                    const StatusIcon = statusConfig[metric.status].icon;
                    return (
                      <tr key={idx} className="hover:bg-muted/30 border-t">
                        <td className="px-4 py-2 font-medium capitalize">{metric.protocol}</td>
                        <td className="px-4 py-2">{metric.symbol}</td>
                        <td className="px-4 py-2 text-right font-mono">
                          {formatLatency(metric.latencyMs)}
                        </td>
                        <td className="text-muted-foreground px-4 py-2 text-right font-mono">
                          {formatLatency(metric.percentile50)}
                        </td>
                        <td className="text-muted-foreground px-4 py-2 text-right font-mono">
                          {formatLatency(metric.percentile90)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Badge
                            variant={
                              metric.status === 'healthy'
                                ? 'default'
                                : metric.status === 'degraded'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="gap-1 text-xs"
                            role="status"
                            aria-label={t(statusConfig[metric.status].ariaLabelKey)}
                          >
                            <StatusIcon className="h-3 w-3" aria-hidden="true" />
                            {t(statusConfig[metric.status].labelKey)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="frequency" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="protocol"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(0, 3)}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatFrequency(value)}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-white p-3 text-sm shadow-lg">
                            <p className="mb-2 font-semibold capitalize">{data.protocol}</p>
                            <p>
                              {t('comparison.latency.updateFrequency')}:{' '}
                              <span className="font-medium">{formatFrequency(data.frequency)}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="frequency" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {trendData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatLatency(value)}
                    />
                    <RechartsTooltip />
                    {Object.keys(trendData[0] || {})
                      .filter((key) => key !== 'timestamp')
                      .map((protocol, index) => (
                        <Line
                          key={protocol}
                          type="monotone"
                          dataKey={protocol}
                          stroke={
                            ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'][index % 5]
                          }
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-muted-foreground flex h-64 items-center justify-center">
                <Activity className="mr-2 h-5 w-5" />
                {t('comparison.latency.selectAssetPairTrends')}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
