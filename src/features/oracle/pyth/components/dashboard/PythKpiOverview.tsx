import React from 'react';

import { cn } from '@/shared/utils';

export type TrendDirection = 'up' | 'down' | 'neutral';

interface KpiCardData {
  value: string | number;
  label: string;
  trend?: TrendDirection;
  changePercent?: number;
  status?: 'success' | 'warning' | 'error' | 'neutral';
}

interface PythKpiStats {
  totalPublishers: number;
  activePublishers: number;
  activePriceFeeds: number;
  avgLatency: number;
}

interface PythKpiOverviewProps {
  stats: PythKpiStats | null;
  loading?: boolean;
  className?: string;
  compact?: boolean;
}

const defaultKpiData: KpiCardData = {
  value: '-',
  label: '',
  trend: 'neutral',
  status: 'neutral',
};

const trendIcons: Record<TrendDirection, React.ReactNode> = {
  up: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ),
  down: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  neutral: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
    </svg>
  ),
};

const statusColors: Record<string, { text: string; bg: string; border: string }> = {
  success: {
    text: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
  },
  warning: {
    text: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
  },
  error: {
    text: 'text-error',
    bg: 'bg-error/10',
    border: 'border-error/20',
  },
  neutral: {
    text: 'text-muted-foreground',
    bg: 'bg-muted/10',
    border: 'border-border/20',
  },
};

const trendColors: Record<TrendDirection, string> = {
  up: 'text-success',
  down: 'text-error',
  neutral: 'text-muted-foreground',
};

function KpiCard({ data, compact }: { data: KpiCardData; compact?: boolean }) {
  const { value, label, trend = 'neutral', changePercent, status = 'neutral' } = data;
  const colors = statusColors[status] ?? statusColors.neutral!;

  return (
    <div
      className={cn(
        'rounded border bg-[rgba(15,23,42,0.8)] backdrop-blur-sm',
        'transition-all duration-200 ease-in-out',
        'hover:border-primary/30 hover:shadow-md hover:shadow-primary/5',
        colors.border,
        compact ? 'p-2.5' : 'p-3',
      )}
    >
      <div className="mb-1 flex items-start justify-between">
        <span
          className={cn('font-medium text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}
        >
          {label}
        </span>
        {trend && trend !== 'neutral' && (
          <span
            className={cn('flex items-center gap-0.5 text-[10px] font-medium', trendColors[trend])}
          >
            {trendIcons[trend]}
            {changePercent !== undefined && `${Math.abs(changePercent)}%`}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'font-mono font-bold tracking-tight',
            colors.text,
            compact ? 'text-lg' : 'text-xl',
          )}
        >
          {value}
        </span>
      </div>

      {changePercent !== undefined && trend === 'neutral' && (
        <div className={cn('mt-0.5 text-[10px]', trendColors[trend])}>
          较上期 {changePercent > 0 ? '+' : ''}
          {changePercent}%
        </div>
      )}
    </div>
  );
}

export function PythKpiOverview({
  stats,
  loading = false,
  className,
  compact = false,
}: PythKpiOverviewProps) {
  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getLatencyStatus = (ms: number): 'success' | 'warning' | 'error' => {
    if (ms < 200) return 'success';
    if (ms < 500) return 'warning';
    return 'error';
  };

  const kpis: Array<KpiCardData & { key: string }> = stats
    ? [
        {
          value: stats.totalPublishers,
          label: '总 Publisher',
          trend: 'neutral' as TrendDirection,
          key: 'totalPublishers',
        },
        {
          value: stats.activePublishers,
          label: '活跃 Publisher',
          trend: 'up' as TrendDirection,
          status: stats.activePublishers > 0 ? ('success' as const) : ('warning' as const),
          key: 'activePublishers',
        },
        {
          value: stats.activePriceFeeds,
          label: '活跃价格源',
          trend: 'up' as TrendDirection,
          status: 'success' as const,
          key: 'activePriceFeeds',
        },
        {
          value: formatLatency(stats.avgLatency),
          label: '平均延迟',
          trend: 'down' as TrendDirection,
          status: getLatencyStatus(stats.avgLatency),
          key: 'avgLatency',
        },
      ]
    : [
        { ...defaultKpiData, label: '总 Publisher', key: 'totalPublishers' },
        { ...defaultKpiData, label: '活跃 Publisher', key: 'activePublishers' },
        { ...defaultKpiData, label: '活跃价格源', key: 'activePriceFeeds' },
        { ...defaultKpiData, label: '平均延迟', key: 'avgLatency' },
      ];

  if (loading) {
    return (
      <div
        className={cn(
          'grid gap-2 md:gap-3',
          compact ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4',
          className,
        )}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'rounded border border-border/20 bg-[rgba(15,23,42,0.8)]',
              compact ? 'h-[72px] p-2.5' : 'h-[88px] p-3',
            )}
          >
            <div className="h-3 w-16 animate-pulse rounded bg-muted/30" />
            <div className="mt-2 h-5 w-20 animate-pulse rounded bg-muted/30" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-2 md:gap-3',
        compact ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4',
        className,
      )}
    >
      {kpis.map((kpi) => (
        <KpiCard key={kpi.key} data={kpi} compact={compact} />
      ))}
    </div>
  );
}

export default PythKpiOverview;
