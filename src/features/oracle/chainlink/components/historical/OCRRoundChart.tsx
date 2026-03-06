'use client';

import { useMemo, memo } from 'react';

import { Activity, Clock, Users } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { CHART_COLORS, CHART_COLOR_PALETTE } from '@/lib/chart-config';
import { cn, formatNumber, formatTime, formatLatency } from '@/shared/utils';

import type { OCRRoundStats, TimeRange } from '../../types';
import { TimeRangeSelector } from './TimeRangeSelector';

export interface OCRRoundChartProps {
  data: OCRRoundStats;
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
  title?: string;
  description?: string;
  height?: number;
}

export const OCRRoundChart = memo(function OCRRoundChart({
  data,
  timeRange,
  onTimeRangeChange,
  className,
  title = 'OCR 轮次统计',
  description = 'OCR 聚合轮次历史与节点参与度分析',
  height = 400,
}: OCRRoundChartProps) {
  const chartData = useMemo(() => {
    if (!data?.history?.length) return [];

    return data.history.map((point) => ({
      timestamp: point.timestamp,
      participants: point.participants,
      aggregationTime: point.aggregationTime,
      gasUsed: point.gasUsed,
      roundId: point.roundId,
      proposer: point.proposer,
    }));
  }, [data]);

  const proposerData = useMemo(() => {
    if (!data?.proposerDistribution) return [];

    return Object.entries(data.proposerDistribution).map(([name, count]) => ({
      name,
      value: count,
      percentage: ((count / data.totalRounds) * 100).toFixed(1),
    }));
  }, [data]);

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

  const stats = [
    {
      icon: Activity,
      label: '总轮次',
      value: formatNumber(data.totalRounds, 0),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Users,
      label: '平均参与节点',
      value: formatNumber(data.avgParticipants, 1),
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      icon: Clock,
      label: '平均聚合时间',
      value: formatLatency(data.avgAggregationTime),
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      icon: Activity,
      label: '平均 Gas 消耗',
      value: formatNumber(data.avgGasUsed, 0),
      color: 'text-purple',
      bgColor: 'bg-purple/10',
    },
  ];

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

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={cn(
                  'flex items-center gap-3 rounded-lg border border-border p-3',
                  stat.bgColor
                )}
              >
                <Icon className={cn('h-5 w-5', stat.color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-sm font-semibold">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {chartData.length > 0 && (
            <>
              <div>
                <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                  参与节点数趋势
                </h4>
                <ResponsiveContainer width="100%" height={height / 2}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient
                        id="colorParticipants"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor={CHART_COLORS.primary.DEFAULT} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.primary.DEFAULT} stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148, 163, 184, 0.2)"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatLabel}
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

                        const entry = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                              {formatLabel(label as string)}
                            </p>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">参与节点:</span>
                                <span className="font-medium">{entry.participants}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">聚合时间:</span>
                                <span className="font-medium">
                                  {formatLatency(entry.aggregationTime)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Gas 消耗:</span>
                                <span className="font-medium">
                                  {formatNumber(entry.gasUsed, 0)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">提议者:</span>
                                <span className="font-medium">{entry.proposer}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                      cursor={{ stroke: CHART_COLORS.primary.DEFAULT, strokeWidth: 1 }}
                    />

                    <Area
                      type="monotone"
                      dataKey="participants"
                      stroke={CHART_COLORS.primary.DEFAULT}
                      strokeWidth={2}
                      fill="url(#colorParticipants)"
                      fillOpacity={0.3}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      isAnimationActive={true}
                      animationDuration={300}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                    聚合时间趋势 (ms)
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData.slice(-50)} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148, 163, 184, 0.2)"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatLabel}
                        stroke="rgba(148, 163, 184, 0.5)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        hide
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
                                {formatLabel(label as string)}
                              </p>
                              <p className="text-xs">
                                <span className="text-muted-foreground">聚合时间:</span>{' '}
                                <span className="font-medium">
                                  {formatLatency(payload[0].value)}
                                </span>
                              </p>
                            </div>
                          );
                        }}
                      />

                      <Bar
                        dataKey="aggregationTime"
                        fill={CHART_COLORS.warning.DEFAULT}
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={300}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                    提议者分布
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;

                          const entry = payload[0].payload as any;
                          return (
                            <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                              <p className="mb-1 text-xs font-medium">{entry.name}</p>
                              <p className="text-xs">
                                <span className="text-muted-foreground">轮次:</span>{' '}
                                <span className="font-medium">{entry.value}</span>
                              </p>
                              <p className="text-xs">
                                <span className="text-muted-foreground">占比:</span>{' '}
                                <span className="font-medium">{entry.percentage}%</span>
                              </p>
                            </div>
                          );
                        }}
                      />

                      <Pie
                        data={proposerData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        isAnimationActive={true}
                        animationDuration={300}
                      >
                        {proposerData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {(!chartData || chartData.length === 0) && (
            <div className="flex items-center justify-center" style={{ height }}>
              <p className="text-sm text-muted-foreground">暂无 OCR 轮次数据</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
