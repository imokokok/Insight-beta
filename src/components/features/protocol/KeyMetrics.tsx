'use client';

import {
  Activity,
  Clock,
  Target,
  Zap,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: 'blue' | 'green' | 'amber' | 'purple';
}

function MetricCard({ icon, label, value, subValue, trend, trendValue, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-rose-600',
    neutral: 'text-muted-foreground',
  };

  return (
    <Card className={cn('border p-4', colorClasses[color])}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium opacity-80">
            {icon}
            {label}
          </div>
          <div className="text-2xl font-bold">{value}</div>
          {subValue && <div className="text-xs opacity-70">{subValue}</div>}
        </div>
        {trend && trendValue && (
          <div className={cn('text-xs font-medium', trendColors[trend])}>
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trend === 'neutral' && '→'} {trendValue}
          </div>
        )}
      </div>
    </Card>
  );
}

interface KeyMetricsProps {
  latency: number;
  accuracy: number;
  uptime: number;
  activeFeeds: number;
  totalFeeds: number;
  className?: string;
}

export function KeyMetrics({
  latency,
  accuracy,
  uptime,
  activeFeeds,
  totalFeeds,
  className,
}: KeyMetricsProps) {
  const { t } = useI18n();

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getLatencyColor = (ms: number): MetricCardProps['color'] => {
    if (ms < 500) return 'green';
    if (ms < 2000) return 'blue';
    return 'amber';
  };

  const getAccuracyColor = (acc: number): MetricCardProps['color'] => {
    if (acc >= 99) return 'green';
    if (acc >= 95) return 'blue';
    return 'amber';
  };

  const getUptimeColor = (up: number): MetricCardProps['color'] => {
    if (up >= 99.9) return 'green';
    if (up >= 99) return 'blue';
    return 'amber';
  };

  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}>
      <MetricCard
        icon={<Clock className="h-4 w-4" />}
        label={t('protocol:metrics.latency')}
        value={formatLatency(latency)}
        subValue={t('protocol:metrics.avgUpdateTime')}
        color={getLatencyColor(latency)}
      />
      <MetricCard
        icon={<Target className="h-4 w-4" />}
        label={t('protocol:metrics.accuracy')}
        value={`${accuracy.toFixed(2)}%`}
        subValue={t('protocol:metrics.priceDeviation')}
        color={getAccuracyColor(accuracy)}
      />
      <MetricCard
        icon={<Activity className="h-4 w-4" />}
        label={t('protocol:metrics.uptime')}
        value={`${uptime.toFixed(2)}%`}
        subValue={t('protocol:metrics.availability')}
        color={getUptimeColor(uptime)}
      />
      <MetricCard
        icon={<Zap className="h-4 w-4" />}
        label={t('protocol:metrics.feeds')}
        value={`${activeFeeds}`}
        subValue={`${t('protocol:metrics.of')} ${totalFeeds}`}
        color="purple"
      />
    </div>
  );
}
