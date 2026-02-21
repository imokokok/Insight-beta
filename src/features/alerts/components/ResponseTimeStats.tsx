'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

import {
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Timer,
  TimerOff,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

import { EnhancedLineChart, EnhancedBarChart, CHART_COLORS } from '@/components/charts';
import { StatCard, ChartCard } from '@/components/common';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n/LanguageProvider';
import { fetchApiData, cn } from '@/shared/utils';

import type { ResponseTimeMetrics, ResponseTimeTrendPoint } from '../types';

interface ResponseTimeStatsData {
  metrics: ResponseTimeMetrics;
  trend: ResponseTimeTrendPoint[];
}

function formatDuration(ms: number): string {
  if (!ms || ms === 0) return '--';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function formatDurationShort(ms: number): string {
  if (!ms || ms === 0) return '--';

  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

interface ResponseTimeStatsProps {
  className?: string;
}

export function ResponseTimeStats({ className }: ResponseTimeStatsProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ResponseTimeStatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState('7');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApiData<{ data: ResponseTimeStatsData }>(
        `/api/alerts/response-time?days=${days}`,
      );
      setData(response.data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch response time stats';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const trendChartData = useMemo(() => {
    if (!data?.trend) return [];
    return data.trend.map((point) => ({
      timestamp: point.date,
      mttr: point.mttr / 60000,
      mtta: point.mtta / 60000,
      alertCount: point.alertCount,
    }));
  }, [data?.trend]);

  const severityChartData = useMemo(() => {
    if (!data?.metrics) return [];
    const { avgResponseTimeBySeverity } = data.metrics;
    return [
      {
        label: t('alerts.responseTime.critical'),
        value: avgResponseTimeBySeverity.critical / 60000,
        color: CHART_COLORS.semantic.error.DEFAULT,
      },
      {
        label: t('alerts.responseTime.high'),
        value: avgResponseTimeBySeverity.high / 60000,
        color: '#f97316',
      },
      {
        label: t('alerts.responseTime.medium'),
        value: avgResponseTimeBySeverity.medium / 60000,
        color: CHART_COLORS.semantic.warning.DEFAULT,
      },
      {
        label: t('alerts.responseTime.low'),
        value: avgResponseTimeBySeverity.low / 60000,
        color: CHART_COLORS.semantic.success.DEFAULT,
      },
    ].filter((item) => item.value > 0);
  }, [data?.metrics, t]);

  const labelFormatter = (label: string | number) => {
    const dateStr = String(label);
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const valueFormatter = (value: number) => `${value.toFixed(0)}m`;

  if (error && !loading && !data) {
    return (
      <Card className={cn('border-red-200 bg-red-50', className)}>
        <CardContent className="flex h-32 items-center justify-center">
          <div className="text-center text-red-600">
            <AlertCircle className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchData} className="mt-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Timer className="h-5 w-5 text-primary" />
            {t('alerts.responseTime.title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('alerts.responseTime.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('alerts.responseTime.last7Days')}</SelectItem>
              <SelectItem value="14">{t('alerts.responseTime.last14Days')}</SelectItem>
              <SelectItem value="30">{t('alerts.responseTime.last30Days')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="mb-2 h-8 w-32" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            title={t('alerts.responseTime.mttr')}
            value={formatDuration(data?.metrics.mttr || 0)}
            icon={<TimerOff className="h-5 w-5" />}
            color="blue"
            subtitle={t('alerts.responseTime.mttrDesc')}
            tooltip={t('alerts.responseTime.mttrTooltip')}
          />
          <StatCard
            title={t('alerts.responseTime.mtta')}
            value={formatDuration(data?.metrics.mtta || 0)}
            icon={<Clock className="h-5 w-5" />}
            color="purple"
            subtitle={t('alerts.responseTime.mttaDesc')}
            tooltip={t('alerts.responseTime.mttaTooltip')}
          />
          <StatCard
            title={t('alerts.responseTime.ackRate')}
            value={`${((data?.metrics.acknowledgementRate || 0) * 100).toFixed(1)}%`}
            icon={<CheckCircle className="h-5 w-5" />}
            color="green"
            subtitle={t('alerts.responseTime.ackRateDesc')}
            status={
              (data?.metrics.acknowledgementRate || 0) >= 0.8
                ? 'healthy'
                : (data?.metrics.acknowledgementRate || 0) >= 0.5
                  ? 'warning'
                  : 'critical'
            }
          />
          <StatCard
            title={t('alerts.responseTime.resolutionRate')}
            value={`${((data?.metrics.resolutionRate || 0) * 100).toFixed(1)}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            color="amber"
            subtitle={t('alerts.responseTime.resolutionRateDesc')}
            status={
              (data?.metrics.resolutionRate || 0) >= 0.7
                ? 'healthy'
                : (data?.metrics.resolutionRate || 0) >= 0.4
                  ? 'warning'
                  : 'critical'
            }
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={t('alerts.responseTime.trendTitle')}
          description={t('alerts.responseTime.trendDesc')}
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          loading={loading && !data}
        >
          {trendChartData.length > 0 ? (
            <EnhancedLineChart
              data={trendChartData}
              height={280}
              lines={[
                {
                  dataKey: 'mttr',
                  name: t('alerts.responseTime.mttr'),
                  color: CHART_COLORS.primary.DEFAULT,
                  strokeWidth: 2,
                },
                {
                  dataKey: 'mtta',
                  name: t('alerts.responseTime.mtta'),
                  color: '#10b981',
                  strokeWidth: 2,
                },
              ]}
              showDots
              valueFormatter={valueFormatter}
              labelFormatter={labelFormatter}
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="mx-auto h-8 w-8 opacity-50" />
                <p className="mt-2">{t('alerts.responseTime.noData')}</p>
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={t('alerts.responseTime.bySeverityTitle')}
          description={t('alerts.responseTime.bySeverityDesc')}
          icon={<BarChart3 className="h-5 w-5 text-primary" />}
          loading={loading && !data}
        >
          {severityChartData.length > 0 ? (
            <EnhancedBarChart
              data={severityChartData}
              height={280}
              bars={[
                {
                  dataKey: 'value',
                  name: t('alerts.responseTime.avgTime'),
                  color: CHART_COLORS.primary.DEFAULT,
                },
              ]}
              valueFormatter={valueFormatter}
              showLegend={false}
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="mx-auto h-8 w-8 opacity-50" />
                <p className="mt-2">{t('alerts.responseTime.noData')}</p>
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {data?.metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-primary" />
              {t('alerts.responseTime.severityBreakdown')}
            </CardTitle>
            <CardDescription>{t('alerts.responseTime.severityBreakdownDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Object.entries(data.metrics.avgResponseTimeBySeverity).map(([severity, time]) => {
                const defaultConfig = {
                  color: 'text-gray-600',
                  bgColor: 'bg-gray-500',
                  label: severity,
                };
                const config: Record<string, { color: string; bgColor: string; label: string }> = {
                  critical: {
                    color: 'text-red-600',
                    bgColor: 'bg-red-500',
                    label: t('alerts.responseTime.critical'),
                  },
                  high: {
                    color: 'text-orange-600',
                    bgColor: 'bg-orange-500',
                    label: t('alerts.responseTime.high'),
                  },
                  medium: {
                    color: 'text-yellow-600',
                    bgColor: 'bg-yellow-500',
                    label: t('alerts.responseTime.medium'),
                  },
                  low: {
                    color: 'text-green-600',
                    bgColor: 'bg-green-500',
                    label: t('alerts.responseTime.low'),
                  },
                };
                const c = config[severity] ?? defaultConfig;
                return (
                  <div key={severity} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge className={c.bgColor}>{c.label}</Badge>
                    </div>
                    <div className={cn('text-2xl font-bold', c.color)}>
                      {formatDurationShort(time)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('alerts.responseTime.avgResponseTime')}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
