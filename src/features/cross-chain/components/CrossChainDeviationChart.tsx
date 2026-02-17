'use client';

import { useMemo, memo } from 'react';

import { AlertTriangle, TrendingUp } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';

import type { CrossChainHistoricalResponse } from '../hooks/useCrossChain';

interface CrossChainDeviationChartProps {
  data?: CrossChainHistoricalResponse['data'];
  isLoading?: boolean;
  height?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

interface ChartDataPoint {
  timestamp: string;
  time: string;
  date: string;
  deviation: number;
  isAnomaly: boolean;
}

export const CrossChainDeviationChart = memo(function CrossChainDeviationChart({
  data,
  isLoading,
  height = 250,
  warningThreshold = 0.5,
  criticalThreshold = 2.0,
}: CrossChainDeviationChartProps) {
  const { t } = useI18n();

  const chartData = useMemo((): ChartDataPoint[] => {
    if (!data?.dataPoints) return [];

    return data.dataPoints.map((point) => {
      const date = new Date(point.timestamp);
      const deviation = point.maxDeviation * 100;
      return {
        timestamp: point.timestamp,
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        deviation,
        isAnomaly: deviation > criticalThreshold,
      };
    });
  }, [data, criticalThreshold]);

  const anomalyCount = useMemo(() => {
    return chartData.filter((d) => d.isAnomaly).length;
  }, [chartData]);

  const avgDeviation = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.deviation, 0) / chartData.length;
  }, [chartData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton style={{ height }} className="w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('crossChain.chart.deviationTrend.title', { symbol: data?.symbol || 'Asset' })}
          </CardTitle>
          <CardDescription>{t('crossChain.chart.noData')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height }} className="flex items-center justify-center text-muted-foreground">
            {t('crossChain.chart.waitingForData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('crossChain.chart.deviationTrend.title', { symbol: data.symbol })}
            </CardTitle>
            <CardDescription>
              {t('crossChain.chart.deviationTrend.description')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {anomalyCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {anomalyCount} anomalies
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="deviationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
                tickFormatter={(value, index) => {
                  if (index === 0 || index === chartData.length - 1) return value;
                  return '';
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                unit="%"
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  backgroundColor: 'white',
                }}
                formatter={(value) => {
                  const numValue = typeof value === 'number' ? value : 0;
                  return [`${numValue.toFixed(2)}%`, t('crossChain.chart.deviation')];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    const point = payload[0].payload as ChartDataPoint;
                    return `${point.date} ${point.time}`;
                  }
                  return String(label);
                }}
              />
              <ReferenceLine
                y={warningThreshold}
                stroke="#eab308"
                strokeDasharray="5 5"
                label={{
                  value: 'Warning',
                  position: 'right',
                  fill: '#eab308',
                  fontSize: 10,
                }}
              />
              <ReferenceLine
                y={criticalThreshold}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{
                  value: 'Critical',
                  position: 'right',
                  fill: '#ef4444',
                  fontSize: 10,
                }}
              />
              <Area
                type="monotone"
                dataKey="deviation"
                stroke="#f97316"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#deviationGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {t('crossChain.historical.avgDeviation')}
            </Badge>
            <span>{avgDeviation.toFixed(2)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {t('crossChain.historical.maxDeviation')}
            </Badge>
            <span>{data.summary?.maxObservedDeviation.toFixed(2) ?? '-'}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {t('crossChain.historical.convergence')}
            </Badge>
            <span>{data.summary?.convergenceCount ?? 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {t('crossChain.historical.divergence')}
            </Badge>
            <span>{data.summary?.divergenceCount ?? 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
