'use client';

import { useMemo } from 'react';

import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

import { EnhancedAreaChart, EnhancedBarChart, CHART_COLORS } from '@/components/charts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n/LanguageProvider';
import { formatNumber, cn } from '@/shared/utils';

import type {
  AlertHistoryPoint,
  AlertHistoryStats,
  TimeRange,
  GroupBy,
} from '../hooks/useAlertHistory';

interface AlertTrendChartProps {
  data: AlertHistoryPoint[];
  stats: AlertHistoryStats | null;
  timeRange: TimeRange;
  groupBy: GroupBy;
  onTimeRangeChange: (range: TimeRange) => void;
  onGroupByChange: (groupBy: GroupBy) => void;
  loading?: boolean;
  className?: string;
  periodStart?: string;
  periodEnd?: string;
  previousStats?: AlertHistoryStats;
}

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1H' },
  { value: '6h', label: '6H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
];

const groupByOptions: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'Total' },
  { value: 'severity', label: 'Severity' },
  { value: 'source', label: 'Source' },
];

const severityColors: Record<string, string> = {
  critical: CHART_COLORS.semantic.error.DEFAULT,
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const sourceColors: Record<string, string> = {
  price_anomaly: CHART_COLORS.series[0],
  cross_chain: CHART_COLORS.series[1],
  security: CHART_COLORS.series[2],
};

function formatTimestamp(timestamp: string, timeRange: TimeRange): string {
  const date = new Date(timestamp);
  if (timeRange === '1h' || timeRange === '6h') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else if (timeRange === '24h') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function formatDateTimeRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const formatDate = (d: Date) =>
    d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function TrendIndicator({ trend, percent }: { trend: string; percent: number }) {
  if (trend === 'stable') {
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <Minus className="h-4 w-4" />
        <span className="text-sm">Stable</span>
      </div>
    );
  }

  const isIncreasing = trend === 'increasing';
  const color = isIncreasing
    ? CHART_COLORS.semantic.error.DEFAULT
    : CHART_COLORS.semantic.success.DEFAULT;
  const Icon = isIncreasing ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-1" style={{ color }}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">
        {isIncreasing ? '+' : ''}
        {percent}%
      </span>
    </div>
  );
}

function ComparisonIndicator({
  current,
  previous,
  label,
}: {
  current: number;
  previous?: number;
  label: string;
}) {
  if (previous === undefined || previous === 0) {
    return null;
  }

  const diff = current - previous;
  const percentChange = Math.round((diff / previous) * 100);
  const isIncrease = diff > 0;

  return (
    <div
      className={cn(
        'ml-2 text-xs',
        isIncrease ? 'text-red-500' : diff < 0 ? 'text-green-500' : 'text-gray-500',
      )}
    >
      {isIncrease ? '+' : ''}
      {percentChange}% {label}
    </div>
  );
}

export function AlertTrendChart({
  data,
  stats,
  timeRange,
  groupBy,
  onTimeRangeChange,
  onGroupByChange,
  loading,
  className,
  periodStart,
  periodEnd,
  previousStats,
}: AlertTrendChartProps) {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      label: formatTimestamp(point.timestamp, timeRange),
    }));
  }, [data, timeRange]);

  const renderChart = useMemo(() => {
    if (groupBy === 'none') {
      return (
        <EnhancedAreaChart
          data={chartData}
          dataKey="count"
          color={CHART_COLORS.primary.DEFAULT}
          height={280}
          valueFormatter={(v) => formatNumber(v, 0)}
          labelFormatter={(l) => String(l)}
          showGrid
          gradient
        />
      );
    }

    if (groupBy === 'severity') {
      return (
        <EnhancedBarChart
          data={chartData}
          bars={[
            { dataKey: 'critical', name: 'Critical', color: severityColors.critical },
            { dataKey: 'high', name: 'High', color: severityColors.high },
            { dataKey: 'medium', name: 'Medium', color: severityColors.medium },
            { dataKey: 'low', name: 'Low', color: severityColors.low },
          ]}
          height={280}
          valueFormatter={(v) => formatNumber(v, 0)}
          labelFormatter={(l) => String(l)}
          showGrid
          showLegend
        />
      );
    }

    if (groupBy === 'source') {
      return (
        <EnhancedBarChart
          data={chartData}
          bars={[
            { dataKey: 'price_anomaly', name: 'Price Anomaly', color: sourceColors.price_anomaly },
            { dataKey: 'cross_chain', name: 'Cross Chain', color: sourceColors.cross_chain },
            { dataKey: 'security', name: 'Security', color: sourceColors.security },
          ]}
          height={280}
          valueFormatter={(v) => formatNumber(v, 0)}
          labelFormatter={(l) => String(l)}
          showGrid
          showLegend
        />
      );
    }

    return null;
  }, [chartData, groupBy]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-2 h-4 w-60" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('alerts.analysis.trendChart')}
            </CardTitle>
            <CardDescription>{t('alerts.analysis.trendChartDesc')}</CardDescription>
            {periodStart && periodEnd && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t('alerts.analysis.periodRange')}: {formatDateTimeRange(periodStart, periodEnd)}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={(v) => onTimeRangeChange(v as TimeRange)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupByOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {stats && (
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">{t('alerts.analysis.totalAlerts')}</p>
              <div className="flex items-baseline">
                <p className="text-xl font-bold">{formatNumber(stats.totalAlerts, 0)}</p>
                <ComparisonIndicator
                  current={stats.totalAlerts}
                  previous={previousStats?.totalAlerts}
                  label={t('alerts.analysis.comparedTo')}
                />
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">{t('alerts.analysis.avgPerHour')}</p>
              <p className="text-xl font-bold">{stats.avgPerHour}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">{t('alerts.analysis.peakHour')}</p>
              <p className="text-xl font-bold">{stats.peakHour}:00</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">{t('alerts.analysis.trend')}</p>
              <TrendIndicator trend={stats.trend} percent={stats.trendPercent} />
            </div>
          </div>
        )}
        {renderChart}
      </CardContent>
    </Card>
  );
}
