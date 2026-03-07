'use client';

import { useMemo, memo, useState } from 'react';

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  XCircle,
} from 'lucide-react';
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Scatter,
  ScatterChart,
  ZAxis,
  Cell,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@/components/ui';
import { CHART_COLORS } from '@/lib/chart-config';
import { cn, formatChartLabel, formatTime } from '@/shared/utils';

import { TimeRangeSelector } from './TimeRangeSelector';

import type { AnomalyEvent, AnomalyStats, TimeRange } from '../../types';

const ANOMALY_ICONS: Record<string, any> = {
  price_spike: TrendingUp,
  price_drop: TrendingDown,
  delayed_update: Clock,
  node_offline: XCircle,
  consensus_failure: AlertCircle,
  unusual_gas: Zap,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-error/10 text-error border-error/20',
  high: 'bg-warning/10 text-warning border-warning/20',
  medium: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  low: 'bg-info/10 text-info border-info/20',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
};

export interface AnomalyTimelineProps {
  data: AnomalyEvent[];
  stats?: AnomalyStats;
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
  title?: string;
  description?: string;
  height?: number;
}

export const AnomalyTimeline = memo(function AnomalyTimeline({
  data = [],
  stats,
  timeRange,
  onTimeRangeChange,
  className,
  title = '异常事件分析',
  description = '系统检测到的异常事件标记与统计',
  height = 400,
}: AnomalyTimelineProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const chartData = useMemo(() => {
    if (!data.length) return [];

    const filtered =
      selectedSeverity === 'all' ? data : data.filter((e) => e.severity === selectedSeverity);

    return filtered.map((event) => {
      const severityValue =
        event.severity === 'critical'
          ? 4
          : event.severity === 'high'
            ? 3
            : event.severity === 'medium'
              ? 2
              : 1;

      return {
        timestamp: event.timestamp,
        severity: severityValue,
        type: event.type,
        description: event.description,
        resolved: !!event.resolvedAt,
        feedId: event.feedId,
        nodeName: event.nodeName,
      };
    });
  }, [data, selectedSeverity]);

  const statsData = useMemo(() => {
    if (!stats) return null;

    return [
      {
        label: '总异常数',
        value: stats.totalAnomalies,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      },
      {
        label: '已解决',
        value: stats.resolvedAnomalies,
        color: 'text-success',
        bgColor: 'bg-success/10',
      },
      {
        label: '严重',
        value: stats.criticalCount,
        color: 'text-error',
        bgColor: 'bg-error/10',
      },
      {
        label: '高',
        value: stats.highCount,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
      },
      {
        label: '中',
        value: stats.mediumCount,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
      },
      {
        label: '低',
        value: stats.lowCount,
        color: 'text-info',
        bgColor: 'bg-info/10',
      },
    ];
  }, [stats]);

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

        {statsData && (
          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-6">
            {statsData.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border border-border p-2',
                  stat.bgColor,
                )}
              >
                <span className={cn('text-lg font-bold', stat.color)}>{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedSeverity('all')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              selectedSeverity === 'all'
                ? 'text-primary-foreground bg-primary'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            全部
          </button>
          {['critical', 'high', 'medium', 'low'].map((severity) => (
            <button
              key={severity}
              type="button"
              onClick={() => setSelectedSeverity(severity)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                'border',
                SEVERITY_COLORS[severity],
                selectedSeverity === severity && 'ring-2 ring-current ring-offset-1',
              )}
            >
              {SEVERITY_LABELS[severity]}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {chartData.length > 0 && (
            <>
              <div>
                <h4 className="mb-2 text-xs font-medium text-muted-foreground">异常事件时间线</h4>
                <ResponsiveContainer width="100%" height={height / 2}>
                  <ScatterChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
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
                      tickFormatter={(v) => ['', '低', '中', '高', '严重'][v] || ''}
                      stroke="rgba(148, 163, 184, 0.5)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      domain={[0, 5]}
                      allowDecimals={false}
                    />

                    <ZAxis type="number" range={[50, 200]} />

                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;

                        const entry = payload[0].payload as any;
                        const Icon = ANOMALY_ICONS[entry.type] || AlertCircle;

                        return (
                          <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                            <div className="mb-2 flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs font-medium">
                                {entry.type.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="space-y-1 text-xs">
                              <p className="text-muted-foreground">
                                {formatChartLabel(timeRange, entry.timestamp)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">严重性:</span>{' '}
                                <span
                                  className={cn(
                                    'font-medium',
                                    entry.severity === 4 && 'text-error',
                                    entry.severity === 3 && 'text-warning',
                                    entry.severity === 2 && 'text-orange-500',
                                    entry.severity === 1 && 'text-info',
                                  )}
                                >
                                  {['', '低', '中', '高', '严重'][entry.severity]}
                                </span>
                              </p>
                              {entry.feedId && (
                                <p>
                                  <span className="text-muted-foreground">Feed:</span>{' '}
                                  <span className="font-medium">{entry.feedId}</span>
                                </p>
                              )}
                              {entry.nodeName && (
                                <p>
                                  <span className="text-muted-foreground">节点:</span>{' '}
                                  <span className="font-medium">{entry.nodeName}</span>
                                </p>
                              )}
                              {entry.resolved && (
                                <p className="text-success">
                                  <CheckCircle2 className="mr-1 inline h-3 w-3" />
                                  已解决
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }}
                      cursor={{ stroke: CHART_COLORS.primary, strokeWidth: 1 }}
                    />

                    <ReferenceLine
                      y={3.5}
                      stroke={CHART_COLORS.error}
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                    />

                    <Scatter
                      dataKey="severity"
                      fill={CHART_COLORS.primary}
                      isAnimationActive={true}
                      animationDuration={300}
                    >
                      {chartData.map((entry, index) => {
                        const color =
                          entry.severity === 4
                            ? CHART_COLORS.error
                            : entry.severity === 3
                              ? CHART_COLORS.warning
                              : entry.severity === 2
                                ? '#f97316'
                                : CHART_COLORS.primary;

                        return (
                          <Cell key={index} fill={color} fillOpacity={entry.resolved ? 0.5 : 1} />
                        );
                      })}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-medium text-muted-foreground">最近异常事件</h4>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {data.slice(0, 10).map((event) => {
                    const Icon = ANOMALY_ICONS[event.type] || AlertCircle;
                    const isResolved = !!event.resolvedAt;

                    return (
                      <div
                        key={event.id}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border border-border p-3 transition-colors',
                          isResolved ? 'bg-muted/30' : 'bg-muted/50',
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full',
                            SEVERITY_COLORS[event.severity],
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                {event.type.replace(/_/g, ' ')}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn('text-xs', SEVERITY_COLORS[event.severity])}
                              >
                                {SEVERITY_LABELS[event.severity]}
                              </Badge>
                              {isResolved && (
                                <Badge
                                  variant="outline"
                                  className="bg-success/10 text-xs text-success"
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  已解决
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(new Date(event.timestamp), 'MM/DD HH:mm')}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>
                          {(event.feedId || event.nodeName) && (
                            <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                              {event.feedId && <span>Feed: {event.feedId}</span>}
                              {event.nodeName && <span>节点：{event.nodeName}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {chartData.length === 0 && (
            <div className="flex items-center justify-center" style={{ height }}>
              <div className="text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-success" />
                <p className="text-sm font-medium">暂无异常事件</p>
                <p className="text-xs text-muted-foreground">系统运行正常，未检测到异常</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
