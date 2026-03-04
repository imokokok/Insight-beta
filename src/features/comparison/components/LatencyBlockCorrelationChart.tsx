'use client';

import { useMemo, useState, useEffect } from 'react';

import { Activity, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { buildApiUrl } from '@/shared/utils';
import { formatLatency } from '@/shared/utils/format';
import type { LatencyBlockCorrelation } from '@/types/oracle/comparison';

interface LatencyBlockCorrelationChartProps {
  data?: LatencyBlockCorrelation[];
  isLoading?: boolean;
  symbol?: string;
  protocol?: string;
  chain?: string;
}

export function LatencyBlockCorrelationChart({
  data: propData,
  isLoading: propLoading,
  symbol,
  protocol,
  chain,
}: LatencyBlockCorrelationChartProps) {
  const { t } = useI18n();
  const [data, setData] = useState<LatencyBlockCorrelation[] | undefined>(propData);
  const [isLoading, setIsLoading] = useState(propLoading ?? false);

  useEffect(() => {
    if (propData) {
      setData(propData);
    } else {
      setIsLoading(true);
      fetch(
        buildApiUrl('/api/comparison/latency/events', {
          symbol,
          protocol,
          chain,
          timeRange: '24h',
          type: 'correlation',
        }),
      )
        .then((res) => res.json())
        .then((result) => {
          if (result.data) {
            setData(result.data);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [symbol, protocol, chain, propData]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((point) => ({
      blockHeight: point.blockHeight,
      latency: point.latency,
      transactionCount: point.transactionCount,
      gasPrice: point.gasPrice,
      timestamp: point.timestamp,
    }));
  }, [data]);

  const correlationStats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const latencies = data.map((d) => d.latency);
    const txCounts = data.map((d) => d.transactionCount);
    const gasPrices = data.map((d) => d.gasPrice);

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const avgTxCount = txCounts.reduce((a, b) => a + b, 0) / txCounts.length;
    const avgGasPrice = gasPrices.reduce((a, b) => a + b, 0) / gasPrices.length;

    const correlation = calculateCorrelation(
      data.map((d) => d.transactionCount),
      data.map((d) => d.latency),
    );

    return {
      avgLatency,
      maxLatency,
      avgTxCount,
      avgGasPrice,
      correlation,
    };
  }, [data]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('comparison.latency.blockCorrelationTitle')}</CardTitle>
          <CardDescription>{t('comparison.status.noData')}</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          <Activity className="mr-2 h-5 w-5" />
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
            <CardTitle className="text-lg font-semibold">
              {t('comparison.latency.blockCorrelationTitle')}
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              {t('comparison.latency.blockCorrelationDesc')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {correlationStats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">{t('comparison.latency.avgLatency')}</p>
              <p className="mt-1 text-lg font-bold">{formatLatency(correlationStats.avgLatency)}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">{t('comparison.latency.maxLatency')}</p>
              <p className="mt-1 text-lg font-bold text-red-600">
                {formatLatency(correlationStats.maxLatency)}
              </p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">{t('comparison.latency.avgTxCount')}</p>
              <p className="mt-1 text-lg font-bold">{correlationStats.avgTxCount.toFixed(0)}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">{t('comparison.latency.correlation')}</p>
              <div className="mt-1 flex items-center gap-1">
                <p className="text-lg font-bold">{correlationStats.correlation.toFixed(2)}</p>
                {correlationStats.correlation > 0.5 ? (
                  <TrendingUp className="h-4 w-4 text-red-600" />
                ) : correlationStats.correlation < -0.5 ? (
                  <TrendingDown className="h-4 w-4 text-emerald-600" />
                ) : null}
              </div>
            </div>
          </div>
        )}

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="transactionCount"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                label={{
                  value: t('comparison.latency.transactionCount'),
                  position: 'bottom',
                  fontSize: 12,
                }}
              />
              <YAxis
                dataKey="latency"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatLatency(value)}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                label={{
                  value: t('comparison.latency.latency'),
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 12,
                }}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-white p-3 text-sm shadow-lg">
                        <p className="mb-2 font-semibold">
                          {t('comparison.latency.blockHeight')}: {data.blockHeight}
                        </p>
                        <div className="space-y-1">
                          <p>
                            {t('comparison.latency.latency')}:{' '}
                            <span className="font-medium">{formatLatency(data.latency)}</span>
                          </p>
                          <p>
                            {t('comparison.latency.transactionCount')}:{' '}
                            <span className="font-medium">{data.transactionCount}</span>
                          </p>
                          <p>
                            {t('comparison.latency.gasPrice')}:{' '}
                            <span className="font-medium">{data.gasPrice.toFixed(2)} Gwei</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(data.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={5000} stroke="#f59e0b" strokeDasharray="3 3" />
              <ReferenceLine y={10000} stroke="#ef4444" strokeDasharray="3 3" />
              <Scatter data={chartData} fill="#8b5cf6">
                {chartData.map((entry, index) => {
                  const color =
                    entry.latency > 10000
                      ? '#ef4444'
                      : entry.latency > 5000
                        ? '#f59e0b'
                        : '#8b5cf6';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {correlationStats && correlationStats.correlation > 0.5 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">
                  {t('comparison.latency.highCorrelationWarning')}
                </p>
                <p className="mt-1 text-amber-700">{t('comparison.latency.highCorrelationDesc')}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * (y[i] ?? 0), 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;

  return numerator / denominator;
}
