'use client';

import { useMemo, memo, useState } from 'react';

import { Award, Clock, Activity, CheckCircle2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { CHART_COLORS, getChartColor } from '@/lib/chart-config';
import { cn, formatNumber } from '@/shared/utils';

import { TimeRangeSelector } from '../historical/TimeRangeSelector';

import type { MultiNodeComparisonData, TimeRange, NodeComparisonMetrics } from '../../types';

export interface MultiNodeComparisonChartProps {
  data: MultiNodeComparisonData;
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
  title?: string;
  description?: string;
  height?: number;
  showRadar?: boolean;
}

export const MultiNodeComparisonChart = memo(function MultiNodeComparisonChart({
  data,
  timeRange,
  onTimeRangeChange,
  className,
  title = '多节点性能对比',
  description = '节点间关键性能指标对比分析',
  height = 400,
  showRadar = true,
}: MultiNodeComparisonChartProps) {
  const [sortBy, setSortBy] = useState<'uptime' | 'response' | 'score'>('score');

  const barChartData = useMemo(() => {
    if (!data?.nodes?.length) return [];

    const sorted = [...data.nodes].sort((a, b) => {
      switch (sortBy) {
        case 'uptime':
          return b.uptime - a.uptime;
        case 'response':
          return a.avgResponseTime - b.avgResponseTime;
        case 'score':
          return b.reliabilityScore - a.reliabilityScore;
        default:
          return 0;
      }
    });

    return sorted.map((node) => ({
      name: node.nodeName,
      uptime: node.uptime,
      responseTime: node.avgResponseTime,
      p95ResponseTime: node.p95ResponseTime,
      supportedFeeds: node.supportedFeedsCount,
      reliabilityScore: node.reliabilityScore,
      trend: node.trend,
      operatorName: node.operatorName,
    }));
  }, [data, sortBy]);

  const radarChartData = useMemo(() => {
    if (!data?.nodes?.length) return [];

    const metrics = ['uptime', 'responseTime', 'supportedFeeds', 'reliabilityScore'];
    const maxValues = {
      uptime: 100,
      responseTime: Math.max(...data.nodes.map((n) => n.avgResponseTime)),
      supportedFeeds: Math.max(...data.nodes.map((n) => n.supportedFeedsCount)),
      reliabilityScore: 100,
    };

    return data.nodes.map((node) => {
      const radarData: any = { subject: node.nodeName };
      metrics.forEach((metric) => {
        const value = node[metric as keyof NodeComparisonMetrics] as number;
        const maxValue = maxValues[metric as keyof typeof maxValues];
        radarData[metric] =
          metric === 'responseTime'
            ? ((maxValue - value) / maxValue) * 100
            : (value / maxValue) * 100;
      });
      return radarData;
    });
  }, [data]);

  const comparisonMetrics = data?.comparisonMetrics;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-error';
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

        {comparisonMetrics && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">平均在线率</span>
              </div>
              <div className="mt-1 text-lg font-semibold">
                {formatNumber(comparisonMetrics.avgUptime, 2)}%
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">最佳节点</span>
              </div>
              <div className="mt-1 truncate text-sm font-medium">
                {comparisonMetrics.bestUptime}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">平均响应时间</span>
              </div>
              <div className="mt-1 text-lg font-semibold">
                {formatNumber(comparisonMetrics.avgResponseTime, 0)}ms
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">最快节点</span>
              </div>
              <div className="mt-1 truncate text-sm font-medium">
                {comparisonMetrics.fastestNode}
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {barChartData.length > 0 ? (
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground">性能指标对比</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSortBy('uptime')}
                    className={cn(
                      'rounded px-2 py-1 text-xs transition-colors',
                      sortBy === 'uptime'
                        ? 'text-primary-foreground bg-primary'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    按在线率
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('response')}
                    className={cn(
                      'rounded px-2 py-1 text-xs transition-colors',
                      sortBy === 'response'
                        ? 'text-primary-foreground bg-primary'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    按响应时间
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('score')}
                    className={cn(
                      'rounded px-2 py-1 text-xs transition-colors',
                      sortBy === 'score'
                        ? 'text-primary-foreground bg-primary'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    按可靠性评分
                  </button>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={height / 2}>
                <BarChart data={barChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148, 163, 184, 0.2)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    stroke="rgba(148, 163, 184, 0.5)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    interval={0}
                  />

                  <YAxis
                    yAxisId="left"
                    stroke="rgba(148, 163, 184, 0.5)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    unit="%"
                  />

                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="rgba(148, 163, 184, 0.5)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    unit="ms"
                  />

                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;

                      const node = data?.nodes?.find((n) => n.nodeName === label);

                      return (
                        <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                          <p className="mb-2 text-xs font-medium">{label}</p>
                          {node && (
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">运营商</span>
                                <span className="font-medium">{node.operatorName || '-'}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">在线率</span>
                                <span className="font-medium">{formatNumber(node.uptime, 2)}%</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">响应时间</span>
                                <span className="font-medium">
                                  {formatNumber(node.avgResponseTime, 0)}ms
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">P95 响应</span>
                                <span className="font-medium">
                                  {formatNumber(node.p95ResponseTime, 0)}ms
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">支持 Feed 数</span>
                                <span className="font-medium">{node.supportedFeedsCount}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">可靠性评分</span>
                                <span
                                  className={cn(
                                    'font-medium',
                                    getScoreColor(node.reliabilityScore),
                                  )}
                                >
                                  {formatNumber(node.reliabilityScore, 0)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                  />

                  <Bar
                    yAxisId="left"
                    dataKey="uptime"
                    name="在线率"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={300}
                  >
                    {barChartData.map((entry, index) => (
                      <Cell
                        key={`cell-uptime-${index}`}
                        fill={
                          entry.uptime >= 99
                            ? CHART_COLORS.success
                            : entry.uptime >= 95
                              ? CHART_COLORS.warning
                              : CHART_COLORS.error
                        }
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>

                  <Bar
                    yAxisId="right"
                    dataKey="responseTime"
                    name="响应时间"
                    radius={[4, 4, 0, 0]}
                    fill={CHART_COLORS.primary}
                    fillOpacity={0.5}
                    isAnimationActive={true}
                    animationDuration={300}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {showRadar && radarChartData.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium text-muted-foreground">综合能力雷达图</h4>
                <ResponsiveContainer width="100%" height={height / 2}>
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    data={radarChartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 12, fill: 'rgba(148, 163, 184, 0.8)' }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: 'rgba(148, 163, 184, 0.6)' }}
                      tickCount={5}
                    />

                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;

                        const entry = payload[0].payload;

                        return (
                          <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                            <p className="mb-2 text-xs font-medium">{entry.subject}</p>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">在线率</span>
                                <span className="font-medium">{formatNumber(entry.uptime, 1)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">响应速度</span>
                                <span className="font-medium">
                                  {formatNumber(100 - entry.responseTime, 1)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Feed 支持</span>
                                <span className="font-medium">
                                  {formatNumber(entry.supportedFeeds, 1)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">可靠性</span>
                                <span className="font-medium">
                                  {formatNumber(entry.reliabilityScore, 1)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />

                    {radarChartData.map((entry, index) => {
                      const color = getChartColor(index);
                      return (
                        <Radar
                          key={entry.subject}
                          name={entry.subject}
                          dataKey="uptime"
                          stroke={color}
                          strokeWidth={2}
                          fill={color}
                          fillOpacity={0.3}
                          isAnimationActive={true}
                          animationDuration={300}
                        />
                      );
                    })}

                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center" style={{ height }}>
            <p className="text-sm text-muted-foreground">暂无对比数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
