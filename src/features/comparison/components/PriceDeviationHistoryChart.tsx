'use client';

import { useMemo, useState, useEffect } from 'react';

import { TrendingUp, TrendingDown, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { logger } from '@/shared/logger';
import { cn } from '@/shared/utils';
import { buildApiUrl } from '@/shared/utils';
import type { PriceDeviationHistory } from '@/types/oracle/comparison';

interface PriceDeviationHistoryChartProps {
  data?: PriceDeviationHistory;
  isLoading?: boolean;
  timeRange?: '24h' | '7d' | '30d';
  onTimeRangeChange?: (range: '24h' | '7d' | '30d') => void;
  symbol?: string;
  protocol?: string;
}

function formatDeviation(value: number): string {
  const percentValue = Math.abs(value) * 100;
  if (percentValue < 0.01) return '<0.01%';
  return `${percentValue.toFixed(2)}%`;
}

function formatTimestamp(timestamp: string, timeRange: string): string {
  const date = new Date(timestamp);
  if (timeRange === '24h') {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function PriceDeviationHistoryChart({
  data: propData,
  isLoading: propLoading,
  timeRange = '24h',
  onTimeRangeChange,
  symbol = 'ETH/USD',
  protocol = 'chainlink',
}: PriceDeviationHistoryChartProps) {
  const { t } = useI18n();
  const [selectedRange, setSelectedRange] = useState<'24h' | '7d' | '30d'>(timeRange);
  const [data, setData] = useState<PriceDeviationHistory | undefined>(propData);
  const [isLoading, setIsLoading] = useState(propLoading ?? false);

  useEffect(() => {
    if (propData) {
      setData(propData);
    } else if (symbol && protocol) {
      setIsLoading(true);
      fetch(
        buildApiUrl('/api/comparison/deviation/history', {
          symbol,
          protocol,
          timeRange: selectedRange,
          type: 'history',
        }),
      )
        .then((res) => res.json())
        .then((result) => {
          if (result.data) {
            setData(result.data);
          }
        })
        .catch((error) => logger.error('Failed to fetch price deviation history', { error }))
        .finally(() => setIsLoading(false));
    }
  }, [symbol, protocol, selectedRange, propData]);

  const handleTimeRangeChange = (range: '24h' | '7d' | '30d') => {
    setSelectedRange(range);
    onTimeRangeChange?.(range);
  };

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.data.map((point) => ({
      timestamp: formatTimestamp(point.timestamp, selectedRange),
      deviation: Math.abs(point.deviationPercent) * 100,
      price: point.price,
      referencePrice: point.referencePrice,
      level: point.deviationLevel,
      rawTimestamp: point.timestamp,
    }));
  }, [data, selectedRange]);

  const summaryCards = useMemo(() => {
    if (!data) return [];
    const { summary } = data;
    return [
      {
        title: t('comparison.deviation.avgDeviation'),
        value: formatDeviation(summary.avgDeviation),
        icon: TrendingUp,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      },
      {
        title: t('comparison.deviation.maxDeviation'),
        value: formatDeviation(summary.maxDeviation),
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      },
      {
        title: t('comparison.deviation.deviationCount'),
        value: summary.deviationCount.toString(),
        icon: TrendingDown,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
      },
      {
        title: t('comparison.deviation.avgDuration'),
        value: `${summary.avgDuration.toFixed(0)}m`,
        icon: Clock,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      },
    ];
  }, [data, t]);

  const durationCards = useMemo(() => {
    if (!data) return [];
    const { summary } = data;
    return [
      {
        title: t('comparison.deviation.maxDuration'),
        value: `${(summary.maxDuration || 0).toFixed(0)}m`,
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      },
      {
        title: t('comparison.deviation.minDuration'),
        value: `${(summary.minDuration || 0).toFixed(0)}m`,
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
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

  if (!data || data.data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('comparison.deviation.historyTitle')}</CardTitle>
          <CardDescription>{t('comparison.status.noData')}</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          <Clock className="mr-2 h-5 w-5" />
          {t('comparison.deviation.selectAssetPair')}
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
              {t('comparison.deviation.historyTitle')}
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              {data.symbol} - {data.protocol}
            </CardDescription>
          </div>
          <Tabs
            value={selectedRange}
            onValueChange={(v) => handleTimeRangeChange(v as '24h' | '7d' | '30d')}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="24h">24h</TabsTrigger>
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.title}
              className={cn('rounded-lg border p-4 transition-all hover:shadow-md', card.bgColor)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className={cn('mt-1 text-2xl font-bold', card.color)}>{card.value}</p>
                </div>
                <div className={cn('rounded-full bg-white/50 p-2', card.color)}>
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {durationCards.map((card) => (
            <div
              key={card.title}
              className={cn('rounded-lg border p-4 transition-all hover:shadow-md', card.bgColor)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className={cn('mt-1 text-2xl font-bold', card.color)}>{card.value}</p>
                </div>
                <div className={cn('rounded-full bg-white/50 p-2', card.color)}>
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(2)}%`}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-white p-3 text-sm shadow-lg">
                        <p className="mb-2 font-semibold">{label}</p>
                        <div className="space-y-1">
                          <p>
                            {t('comparison.deviation.deviation')}:{' '}
                            <span className="font-medium">
                              {formatDeviation(data.deviation / 100)}
                            </span>
                          </p>
                          <p>
                            {t('comparison.price')}:{' '}
                            <span className="font-medium">${data.price.toFixed(4)}</span>
                          </p>
                          <p>
                            {t('comparison.referencePrice')}:{' '}
                            <span className="font-medium">${data.referencePrice.toFixed(4)}</span>
                          </p>
                          <div className="flex items-center gap-1">
                            <span>{t('comparison.deviation.level')}:</span>
                            <Badge
                              variant={
                                data.level === 'critical'
                                  ? 'destructive'
                                  : data.level === 'high'
                                    ? 'default'
                                    : 'secondary'
                              }
                              className="text-xs"
                            >
                              {t(`comparison.status.${data.level}`)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0.1} stroke="#f59e0b" strokeDasharray="3 3" label="Medium" />
              <ReferenceLine y={0.5} stroke="#ef4444" strokeDasharray="3 3" label="High" />
              <ReferenceLine y={1.0} stroke="#dc2626" strokeDasharray="3 3" label="Critical" />
              <Line
                type="monotone"
                dataKey="deviation"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#8b5cf6' }}
              />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {data.summary.criticalCount > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div className="text-sm">
                <p className="font-medium text-red-900">
                  {t('comparison.deviation.criticalWarning')}
                </p>
                <p className="mt-1 text-red-700">
                  {t('comparison.deviation.criticalWarningDesc', {
                    count: data.summary.criticalCount,
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
