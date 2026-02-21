'use client';

import { useMemo } from 'react';

import { TrendingUp } from 'lucide-react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useIsMobile } from '@/hooks';
import { useI18n } from '@/i18n';

import type { UptimeTrendPoint, TimePeriod } from '../types/api3';

interface AirnodeUptimeChartProps {
  uptimeTrend: UptimeTrendPoint[];
  timePeriod: TimePeriod;
  className?: string;
}

interface ChartData {
  time: string;
  timestamp: string;
  uptimePercentage: number;
  responseTimeMs: number;
}

export function AirnodeUptimeChart({
  uptimeTrend,
  timePeriod,
  className,
}: AirnodeUptimeChartProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  const chartData = useMemo<ChartData[]>(() => {
    return uptimeTrend.map((point) => {
      let timeLabel;
      const date = new Date(point.timestamp);

      if (timePeriod === 'day') {
        timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (timePeriod === 'week') {
        timeLabel = date.toLocaleDateString([], { weekday: 'short', hour: '2-digit' });
      } else {
        timeLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }

      return {
        time: timeLabel,
        timestamp: point.timestamp,
        uptimePercentage: point.uptimePercentage,
        responseTimeMs: point.responseTimeMs,
      };
    });
  }, [uptimeTrend, timePeriod]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="mb-2 text-xs text-muted-foreground">
            {new Date(payload[0].payload.timestamp).toLocaleString()}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground">
                  {entry.name === 'uptimePercentage' ? '在线率' : '响应时间'}
                </span>
                <span className="text-sm font-semibold">
                  {entry.name === 'uptimePercentage'
                    ? `${entry.value.toFixed(2)}%`
                    : `${entry.value}ms`}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const getUptimeColor = (percentage: number) => {
    if (percentage >= 99) return '#22c55e';
    if (percentage >= 95) return '#eab308';
    return '#ef4444';
  };

  const avgUptime = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, point) => acc + point.uptimePercentage, 0);
    return sum / chartData.length;
  }, [chartData]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t('api3.airnode.uptimeTrend') || '在线率趋势'}
            </CardTitle>
            <CardDescription>
              {t('api3.airnode.uptimeTrendDescription') || 'Airnode 在线率和响应时间的历史趋势'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">平均在线率</p>
              <p className="text-lg font-bold" style={{ color: getUptimeColor(avgUptime) }}>
                {avgUptime.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: isMobile ? 9 : 11 }}
                interval="preserveStartEnd"
                className="text-muted-foreground"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: isMobile ? 10 : 12 }}
                className="text-muted-foreground"
                unit="%"
                domain={[90, 100]}
                width={isMobile ? 40 : 50}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: isMobile ? 10 : 12 }}
                className="text-muted-foreground"
                unit="ms"
                width={isMobile ? 40 : 50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="uptimePercentage"
                name="在线率"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#uptimeGradient)"
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="responseTimeMs"
                name="响应时间"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
